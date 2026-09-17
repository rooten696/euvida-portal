export function reusableAffiliateLink(record, request, project = 572910, marker = 776456) {
  if (record?.sourceUrl !== request.url || record?.subId !== request.sub_id) return false;
  try {
    const url = new URL(record.url);
    return url.protocol === 'https:' && url.hostname === 'tp.media' && !url.username && !url.password &&
      url.searchParams.get('trs') === String(project) && url.searchParams.get('marker') === String(marker) &&
      url.searchParams.get('sub_id') === request.sub_id && url.searchParams.get('u') === request.url;
  } catch { return false; }
}
