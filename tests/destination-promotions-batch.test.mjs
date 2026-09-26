import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REPRESENTATIVE_DESTINATION_PAYLOAD,
  validateDestinationBatchPayload,
  executeDestinationBatch,
} from '../scripts/destination-promotions-batch.mjs';

test('representative payload contains valid countries and regions with Booking + flights + 3rd campaign', () => {
  const payload = REPRESENTATIVE_DESTINATION_PAYLOAD;
  assert.ok(Array.isArray(payload), 'Payload must be an array');
  assert.ok(payload.length >= 4, 'Payload should cover at least 4 destinations (countries + regions)');

  const countries = payload.filter((item) => item.target_type === 'country');
  const regions = payload.filter((item) => item.target_type === 'region');

  assert.ok(countries.length >= 2, 'Should cover at least 2 countries');
  assert.ok(regions.length >= 2, 'Should cover at least 2 regions');

  for (const item of payload) {
    assert.ok(item.promotions.length >= 2 && item.promotions.length <= 3, 'Each destination must have 2-3 campaigns');

    const campaignIds = item.promotions.map((p) => p.campaign_id);
    assert.ok(campaignIds.includes('stay'), 'Must include accommodation (stay)');
    assert.ok(campaignIds.includes('flight'), 'Must include flights (flight)');

    for (const promo of item.promotions) {
      assert.ok(['Booking.com', 'Kiwi.com', 'Aviasales', 'DiscoverCars', 'GetYourGuide'].includes(promo.provider));
      for (const loc of ['cs', 'en', 'de', 'fr', 'es']) {
        assert.ok(promo.title[loc] && promo.title[loc].length >= 5, `Missing ${loc} title`);
        assert.ok(promo.description[loc] && promo.description[loc].length >= 10, `Missing ${loc} description`);
        assert.ok(promo.links[loc]?.url, `Missing ${loc} url`);
        assert.ok(promo.links[loc]?.subId, `Missing ${loc} subId`);
      }
    }
  }

  const validation = validateDestinationBatchPayload(payload);
  assert.equal(validation.valid, true, `Validation failed: ${validation.error}`);
});

test('validateDestinationBatchPayload rejects incomplete translations or invalid tp.media links', () => {
  // Tampered: missing locale
  const missingLocalePayload = structuredClone(REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 1));
  delete missingLocalePayload[0].promotions[0].title.fr;
  const val1 = validateDestinationBatchPayload(missingLocalePayload);
  assert.equal(val1.valid, false);
  assert.match(val1.error, /missing fr/i);

  // Tampered: disallowed destination host
  const evilHostPayload = structuredClone(REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 1));
  evilHostPayload[0].promotions[0].links.cs.url = 'https://tp.media/r?marker=776456&trs=572910&sub_id=eu_cs_country_cze_stay_end_v1&u=https%3A%2F%2Fevil-phishing.com%2F';
  const val2 = validateDestinationBatchPayload(evilHostPayload);
  assert.equal(val2.valid, false);
  assert.match(val2.error, /allowlist|invalid tracking/i);

  // Tampered: wrong sub_id
  const wrongSubIdPayload = structuredClone(REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 1));
  wrongSubIdPayload[0].promotions[0].links.cs.subId = 'wrong_sub_id';
  const val3 = validateDestinationBatchPayload(wrongSubIdPayload);
  assert.equal(val3.valid, false);
  assert.match(val3.error, /sub_id mismatch/i);

  // Tampered: wrong campaign count (>3)
  const tooManyPromotionsPayload = structuredClone(REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 1));
  tooManyPromotionsPayload[0].promotions.push(structuredClone(tooManyPromotionsPayload[0].promotions[0]));
  tooManyPromotionsPayload[0].promotions.push(structuredClone(tooManyPromotionsPayload[0].promotions[0]));
  const val4 = validateDestinationBatchPayload(tooManyPromotionsPayload);
  assert.equal(val4.valid, false);
  assert.match(val4.error, /campaigns per target/i);
});

test('executeDestinationBatch enforces default HARD_DRY_RUN and rejects writes without full opt-in', async () => {
  // 1. Default execution without args: runs in HARD_DRY_RUN
  const dryRunResult = await executeDestinationBatch({
    payload: REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 2),
    apply: false,
    env: {},
  });

  assert.equal(dryRunResult.mode, 'HARD_DRY_RUN');
  assert.equal(dryRunResult.writesPerformed, 0);
  assert.equal(dryRunResult.success, true);
  assert.ok(dryRunResult.summary.includes('HARD_DRY_RUN'));

  // 2. Attempting write with apply=true but missing env vars: MUST throw / fail closed
  await assert.rejects(
    async () => {
      await executeDestinationBatch({
        payload: REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 2),
        apply: true,
        env: {},
      });
    },
    /Write opt-in required/
  );

  // 3. Attempting write with apply=true and only one env var: MUST throw / fail closed
  await assert.rejects(
    async () => {
      await executeDestinationBatch({
        payload: REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 2),
        apply: true,
        env: { EUVIDA_DB_WRITES_ENABLED: '1' },
      });
    },
    /EUVIDA_PROMOTIONS_ALLOW_WRITE/
  );

  // 4. Attempting write with all env vars but missing client: MUST throw
  await assert.rejects(
    async () => {
      await executeDestinationBatch({
        payload: REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 2),
        apply: true,
        env: {
          EUVIDA_DB_WRITES_ENABLED: '1',
          EUVIDA_PROMOTIONS_ALLOW_WRITE: 'YES_I_UNDERSTAND',
        },
      });
    },
    /Supabase client with service_role required/
  );

  // 5. Executing write with all opt-in and mock client: succeeds and tracks writes
  const upsertedTargets = [];
  const upsertedPromos = [];
  const mockClient = {
    from(table) {
      if (table === 'promotion_targets') {
        return {
          upsert(row) {
            upsertedTargets.push(row);
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: { id: `mock-target-${row.target_key}` }, error: null });
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'promotions') {
        return {
          upsert(row) {
            upsertedPromos.push(row);
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  const samplePayload = REPRESENTATIVE_DESTINATION_PAYLOAD.slice(0, 2);
  const totalExpectedPromos = samplePayload.reduce((acc, item) => acc + item.promotions.length, 0);

  const applyResult = await executeDestinationBatch({
    payload: samplePayload,
    apply: true,
    env: {
      EUVIDA_DB_WRITES_ENABLED: '1',
      EUVIDA_PROMOTIONS_ALLOW_WRITE: 'YES_I_UNDERSTAND',
    },
    client: mockClient,
  });

  assert.equal(applyResult.mode, 'APPLY');
  assert.equal(applyResult.success, true);
  assert.equal(applyResult.writesPerformed, totalExpectedPromos);
  assert.equal(upsertedTargets.length, 2);
  assert.equal(upsertedPromos.length, totalExpectedPromos);
});
