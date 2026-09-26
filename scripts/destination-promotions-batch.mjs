import { buildDestinationSubId } from '../lib/destination-promotions.mjs';
import { isValidAffiliateUrl, AFFILIATE_PROJECT, AFFILIATE_MARKER } from '../lib/affiliate-link-validation.mjs';

export const SUPPORTED_LOCALES = ['cs', 'en', 'de', 'fr', 'es'];

/**
 * Representative hard-dry-run payload for countries and regions.
 * Genuine Travelpayouts campaigns:
 * - Booking.com (stay)
 * - Kiwi.com / Aviasales (flight)
 * - DiscoverCars / GetYourGuide (car_rental / experiences)
 */
export const REPRESENTATIVE_DESTINATION_PAYLOAD = [
  {
    target_type: 'country',
    target_key: 'CZE',
    name: 'Česko',
    promotions: [
      {
        campaign_id: 'stay',
        provider: 'Booking.com',
        placement: 'country_bottom',
        title: {
          cs: 'Ubytování v Česku',
          en: 'Places to stay in Czechia',
          de: 'Unterkünfte in Tschechien',
          fr: 'Hébergements en République tchèque',
          es: 'Alojamientos en Chequia',
        },
        description: {
          cs: 'Vyberte si z prověřených hotelů, penzionů a apartmánů po celé zemi.',
          en: 'Choose from verified hotels, guesthouses, and apartments across the country.',
          de: 'Wählen Sie aus geprüften Hotels, Pensionen und Apartments im ganzen Land.',
          fr: 'Choisissez parmi des hôtels, pensions et appartements vérifiés dans tout le pays.',
          es: 'Elige entre hoteles, pensiones y apartamentos verificados en todo el país.',
        },
        call_to_action: {
          cs: 'Vybrat ubytování',
          en: 'Find a place to stay',
          de: 'Unterkunft finden',
          fr: 'Trouver un hébergement',
          es: 'Buscar alojamiento',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.cs.html`, subId: 'eu_cs_country_cze_stay_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.en-gb.html`, subId: 'eu_en_country_cze_stay_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.de.html`, subId: 'eu_de_country_cze_stay_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.fr.html`, subId: 'eu_fr_country_cze_stay_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_cze_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fcz.es.html`, subId: 'eu_es_country_cze_stay_end_v1' },
        },
        active: true,
        sort_order: 1,
      },
      {
        campaign_id: 'flight',
        provider: 'Kiwi.com',
        placement: 'country_bottom',
        title: {
          cs: 'Letecké spojení do Česka',
          en: 'Flights to Czechia',
          de: 'Flüge nach Tschechien',
          fr: 'Vols vers la République tchèque',
          es: 'Vuelos a Chequia',
        },
        description: {
          cs: 'Porovnejte přímé lety i výhodné kombinace spojení do Prahy a dalších měst.',
          en: 'Compare direct flights and cost-effective route combinations to Prague and beyond.',
          de: 'Vergleichen Sie Direktflüge und günstige Kombinationen nach Prag und weitere Städte.',
          fr: 'Comparez les vols directs et les meilleures combinaisons vers Prague et d’autres villes.',
          es: 'Compara vuelos directos y conexiones económicas a Praga y otras ciudades.',
        },
        call_to_action: {
          cs: 'Najít letenky',
          en: 'Find flights',
          de: 'Flüge finden',
          fr: 'Trouver des vols',
          es: 'Buscar vuelos',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fcs%2Fcountry%2Fczechia%2F`, subId: 'eu_cs_country_cze_flight_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fcountry%2Fczechia%2F`, subId: 'eu_en_country_cze_flight_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fde%2Fcountry%2Fczechia%2F`, subId: 'eu_de_country_cze_flight_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Ffr%2Fcountry%2Fczechia%2F`, subId: 'eu_fr_country_cze_flight_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_cze_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fes%2Fcountry%2Fczechia%2F`, subId: 'eu_es_country_cze_flight_end_v1' },
        },
        active: true,
        sort_order: 2,
      },
      {
        campaign_id: 'car_rental',
        provider: 'DiscoverCars',
        placement: 'country_bottom',
        title: {
          cs: 'Půjčení auta na cestování',
          en: 'Car rental for your travels',
          de: 'Mietwagen für Ihre Reise',
          fr: 'Location de voiture pour votre voyage',
          es: 'Alquiler de coche para tu viaje',
        },
        description: {
          cs: 'Půjčte si auto na letišti nebo ve městě a objevujte zemi podle vlastního plánu.',
          en: 'Rent a car at the airport or in the city to explore the country on your own schedule.',
          de: 'Mieten Sie ein Auto am Flughafen oder in der Stadt für flexible Erkundungen.',
          fr: 'Louez une voiture à l’aéroport ou en ville pour explorer le pays en toute liberté.',
          es: 'Alquila un coche en el aeropuerto o en la ciudad para viajar a tu propio ritmo.',
        },
        call_to_action: {
          cs: 'Půjčit auto',
          en: 'Rent a car',
          de: 'Mietwagen buchen',
          fr: 'Louer une voiture',
          es: 'Alquilar un coche',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fcs`, subId: 'eu_cs_country_cze_car_rental_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fen`, subId: 'eu_en_country_cze_car_rental_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fde`, subId: 'eu_de_country_cze_car_rental_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Ffr`, subId: 'eu_fr_country_cze_car_rental_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_cze_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fes`, subId: 'eu_es_country_cze_car_rental_end_v1' },
        },
        active: true,
        sort_order: 3,
      },
    ],
  },
  {
    target_type: 'country',
    target_key: 'SVN',
    name: 'Slovinsko',
    promotions: [
      {
        campaign_id: 'stay',
        provider: 'Booking.com',
        placement: 'country_bottom',
        title: {
          cs: 'Ubytování ve Slovinsku',
          en: 'Places to stay in Slovenia',
          de: 'Unterkünfte in Slowenien',
          fr: 'Hébergements en Slovénie',
          es: 'Alojamientos en Eslovenia',
        },
        description: {
          cs: 'Od alpských horských chat a penzionů po hotely u pobřeží a v Lublani.',
          en: 'From alpine chalets and mountain guesthouses to coastal and Ljubljana hotels.',
          de: 'Von alpinen Bergchalets bis zu Hotels an der Küste und in Ljubljana.',
          fr: 'Des chalets alpins aux hôtels de la côte et de Ljubljana.',
          es: 'Desde chalets alpinos hasta hoteles en la costa y en Liubliana.',
        },
        call_to_action: {
          cs: 'Vybrat ubytování',
          en: 'Find a place to stay',
          de: 'Unterkunft finden',
          fr: 'Trouver un hébergement',
          es: 'Buscar alojamiento',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_svn_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fsi.cs.html`, subId: 'eu_cs_country_svn_stay_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_svn_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fsi.en-gb.html`, subId: 'eu_en_country_svn_stay_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_svn_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fsi.de.html`, subId: 'eu_de_country_svn_stay_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_svn_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fsi.fr.html`, subId: 'eu_fr_country_svn_stay_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_svn_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcountry%2Fsi.es.html`, subId: 'eu_es_country_svn_stay_end_v1' },
        },
        active: true,
        sort_order: 1,
      },
      {
        campaign_id: 'flight',
        provider: 'Kiwi.com',
        placement: 'country_bottom',
        title: {
          cs: 'Lety do Slovinska a okolí',
          en: 'Flights to Slovenia & nearby hubs',
          de: 'Flüge nach Slowenien',
          fr: 'Vols vers la Slovénie',
          es: 'Vuelos a Eslovenia',
        },
        description: {
          cs: 'Najděte spojení do Lublaně i blízkých letišť v Benátkách, Záhřebu či Terstu.',
          en: 'Find flights to Ljubljana and nearby regional airports in Venice, Zagreb, or Trieste.',
          de: 'Finden Sie Flüge nach Ljubljana und umliegende Flughäfen wie Venedig oder Triest.',
          fr: 'Trouvez des vols vers Ljubljana et les aéroports voisins de Venise ou Trieste.',
          es: 'Encuentra vuelos a Liubliana y aeropuertos cercanos como Venecia o Trieste.',
        },
        call_to_action: {
          cs: 'Najít letenky',
          en: 'Find flights',
          de: 'Flüge finden',
          fr: 'Trouver des vols',
          es: 'Buscar vuelos',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_svn_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fcs%2Fcountry%2Fslovenia%2F`, subId: 'eu_cs_country_svn_flight_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_svn_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fcountry%2Fslovenia%2F`, subId: 'eu_en_country_svn_flight_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_svn_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fde%2Fcountry%2Fslovenia%2F`, subId: 'eu_de_country_svn_flight_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_svn_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Ffr%2Fcountry%2Fslovenia%2F`, subId: 'eu_fr_country_svn_flight_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_svn_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fes%2Fcountry%2Fslovenia%2F`, subId: 'eu_es_country_svn_flight_end_v1' },
        },
        active: true,
        sort_order: 2,
      },
      {
        campaign_id: 'car_rental',
        provider: 'DiscoverCars',
        placement: 'country_bottom',
        title: {
          cs: 'Půjčení auta ve Slovinsku',
          en: 'Car rental in Slovenia',
          de: 'Mietwagen in Slowenien',
          fr: 'Location de voiture en Slovénie',
          es: 'Alquiler de coche en Eslovenia',
        },
        description: {
          cs: 'Ideální volba pro výlety do Julských Alp, k jezerům Bled a Bohinj i k moři.',
          en: 'The ideal way to explore the Julian Alps, lakes Bled and Bohinj, and the coast.',
          de: 'Perfekt für Ausflüge in die Julischen Alpen, zum Bleder See und an die Küste.',
          fr: 'Le moyen idéal pour explorer les Alpes juliennes, les lacs de Bled et la côte.',
          es: 'Ideal para explorar los Alpes Julianos, los lagos Bled y Bohinj y la costa.',
        },
        call_to_action: {
          cs: 'Půjčit auto',
          en: 'Rent a car',
          de: 'Mietwagen buchen',
          fr: 'Louer une voiture',
          es: 'Alquilar un coche',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_country_svn_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fcs`, subId: 'eu_cs_country_svn_car_rental_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_country_svn_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fen`, subId: 'eu_en_country_svn_car_rental_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_country_svn_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fde`, subId: 'eu_de_country_svn_car_rental_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_country_svn_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Ffr`, subId: 'eu_fr_country_svn_car_rental_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_country_svn_car_rental_end_v1&u=https%3A%2F%2Fwww.discovercars.com%2Fes`, subId: 'eu_es_country_svn_car_rental_end_v1' },
        },
        active: true,
        sort_order: 3,
      },
    ],
  },
  {
    target_type: 'region',
    target_key: '07441af1-fcb0-4751-b1fe-9527e1ef7b43',
    name: 'Praha',
    promotions: [
      {
        campaign_id: 'stay',
        provider: 'Booking.com',
        placement: 'region_bottom',
        title: {
          cs: 'Ubytování v Praze',
          en: 'Places to stay in Prague',
          de: 'Unterkünfte in Prag',
          fr: 'Hébergements à Prague',
          es: 'Alojamientos en Praga',
        },
        description: {
          cs: 'Vyberte si ubytování v historickém centru, u Vltavy i v klidnějších čtvrtích.',
          en: 'Find hotels and apartments in the historic centre, along the Vltava, or in quiet neighbourhoods.',
          de: 'Finden Sie Hotels und Apartments im historischen Zentrum oder in ruhigen Vierteln.',
          fr: 'Trouvez des hôtels et appartements dans le centre historique ou au calme.',
          es: 'Encuentra hoteles y apartamentos en el centro histórico o en barrios tranquilos.',
        },
        call_to_action: {
          cs: 'Vybrat ubytování',
          en: 'Find a place to stay',
          de: 'Unterkunft finden',
          fr: 'Trouver un hébergement',
          es: 'Buscar alojamiento',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.cs.html`, subId: 'eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.en-gb.html`, subId: 'eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.de.html`, subId: 'eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.fr.html`, subId: 'eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fcz%2Fprague.es.html`, subId: 'eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_stay_end_v1' },
        },
        active: true,
        sort_order: 1,
      },
      {
        campaign_id: 'flight',
        provider: 'Kiwi.com',
        placement: 'region_bottom',
        title: {
          cs: 'Letenky do Prahy (PRG)',
          en: 'Flights to Prague (PRG)',
          de: 'Flüge nach Prag (PRG)',
          fr: 'Vols vers Prague (PRG)',
          es: 'Vuelos a Praga (PRG)',
        },
        description: {
          cs: 'Porovnejte přímé i nízkonákladové lety na Letiště Václava Havla Praha.',
          en: 'Compare direct and low-cost flights to Václav Havel Airport Prague.',
          de: 'Vergleichen Sie Direkt- und Billigflüge zum Flughafen Prag.',
          fr: 'Comparez les vols directs et low-cost vers l’aéroport de Prague.',
          es: 'Compara vuelos directos y de bajo coste al aeropuerto de Praga.',
        },
        call_to_action: {
          cs: 'Najít letenky',
          en: 'Find flights',
          de: 'Flüge finden',
          fr: 'Trouver des vols',
          es: 'Buscar vuelos',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fcs%2Fsearch%2Fresults%2Fprague-czechia%2Fanywhere`, subId: 'eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fsearch%2Fresults%2Fprague-czechia%2Fanywhere`, subId: 'eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fde%2Fsearch%2Fresults%2Fprague-czechia%2Fanywhere`, subId: 'eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Ffr%2Fsearch%2Fresults%2Fprague-czechia%2Fanywhere`, subId: 'eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fes%2Fsearch%2Fresults%2Fprague-czechia%2Fanywhere`, subId: 'eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_flight_end_v1' },
        },
        active: true,
        sort_order: 2,
      },
      {
        campaign_id: 'experiences',
        provider: 'GetYourGuide',
        placement: 'region_bottom',
        title: {
          cs: 'Zážitky a prohlídky v Praze',
          en: 'Tours & experiences in Prague',
          de: 'Touren & Erlebnisse in Prag',
          fr: 'Visites et expériences à Prague',
          es: 'Tours y experiencias en Praga',
        },
        description: {
          cs: 'Prohlídky Pražského hradu, plavby po Vltavě a vstupenky bez čekání.',
          en: 'Prague Castle tours, Vltava river cruises, and skip-the-line tickets.',
          de: 'Prager Burgführungen, Moldauschifffahrten und Schnelleinlass-Tickets.',
          fr: 'Visites du château de Prague, croisières sur la Vltava et billets coupe-file.',
          es: 'Visitas al Castillo de Praga, cruceros por el Moldava y entradas sin colas.',
        },
        call_to_action: {
          cs: 'Ověřit termín a cenu',
          en: 'Check dates and prices',
          de: 'Termine und Preise prüfen',
          fr: 'Voir les dates et les tarifs',
          es: 'Consultar fechas y precios',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fprague-l10%2F`, subId: 'eu_cs_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fprague-l10%2F`, subId: 'eu_en_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fprague-l10%2F`, subId: 'eu_de_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fprague-l10%2F`, subId: 'eu_fr_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1&u=https%3A%2F%2Fwww.getyourguide.com%2Fprague-l10%2F`, subId: 'eu_es_region_07441af1fcb04751b1fe9527e1ef7b43_experiences_end_v1' },
        },
        active: true,
        sort_order: 3,
      },
    ],
  },
  {
    target_type: 'region',
    target_key: '44b6115e-bba9-43b7-85cb-c12ef9f238fa',
    name: 'Athény, Attika a Saronské ostrovy',
    promotions: [
      {
        campaign_id: 'stay',
        provider: 'Booking.com',
        placement: 'region_bottom',
        title: {
          cs: 'Ubytování v Athénách a na Attice',
          en: 'Places to stay in Athens & Attica',
          de: 'Unterkünfte in Athen und Attika',
          fr: 'Hébergements à Athènes et en Attique',
          es: 'Alojamientos en Atenas y Ática',
        },
        description: {
          cs: 'Hotely v centru s výhledem na Akropoli i pobřežní resorty Athénské riviéry.',
          en: 'Hotels overlooking the Acropolis and seaside resorts on the Athens Riviera.',
          de: 'Hotels mit Blick auf die Akropolis sowie Resorts an der Athener Riviera.',
          fr: 'Hôtels avec vue sur l’Acropole et complexes sur la riviera athénienne.',
          es: 'Hoteles con vistas a la Acrópolis y complejos en la riviera ateniense.',
        },
        call_to_action: {
          cs: 'Vybrat ubytování',
          en: 'Find a place to stay',
          de: 'Unterkunft finden',
          fr: 'Trouver un hébergement',
          es: 'Buscar alojamiento',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fgr%2Fathens.cs.html`, subId: 'eu_cs_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fgr%2Fathens.en-gb.html`, subId: 'eu_en_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fgr%2Fathens.de.html`, subId: 'eu_de_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fgr%2Fathens.fr.html`, subId: 'eu_fr_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1&u=https%3A%2F%2Fwww.booking.com%2Fcity%2Fgr%2Fathens.es.html`, subId: 'eu_es_region_44b6115ebba943b785cbc12ef9f238fa_stay_end_v1' },
        },
        active: true,
        sort_order: 1,
      },
      {
        campaign_id: 'flight',
        provider: 'Kiwi.com',
        placement: 'region_bottom',
        title: {
          cs: 'Lety do Athén (ATH)',
          en: 'Flights to Athens (ATH)',
          de: 'Flüge nach Athen (ATH)',
          fr: 'Vols vers Athènes (ATH)',
          es: 'Vuelos a Atenas (ATH)',
        },
        description: {
          cs: 'Vyhledejte přímé i návazné lety na mezinárodní letiště Eleftherios Venizelos.',
          en: 'Search direct and connecting flights to Athens International Airport.',
          de: 'Direkt- und Anschlussflüge zum internationalen Flughafen Athen suchen.',
          fr: 'Recherchez des vols directs et avec escale vers l’aéroport international d’Athènes.',
          es: 'Busca vuelos directos y con escala al aeropuerto internacional de Atenas.',
        },
        call_to_action: {
          cs: 'Najít letenky',
          en: 'Find flights',
          de: 'Flüge finden',
          fr: 'Trouver des vols',
          es: 'Buscar vuelos',
        },
        links: {
          cs: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_cs_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fcs%2Fsearch%2Fresults%2Fathens-greece%2Fanywhere`, subId: 'eu_cs_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1' },
          en: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_en_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fen%2Fsearch%2Fresults%2Fathens-greece%2Fanywhere`, subId: 'eu_en_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1' },
          de: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_de_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fde%2Fsearch%2Fresults%2Fathens-greece%2Fanywhere`, subId: 'eu_de_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1' },
          fr: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_fr_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Ffr%2Fsearch%2Fresults%2Fathens-greece%2Fanywhere`, subId: 'eu_fr_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1' },
          es: { url: `https://tp.media/r?marker=${AFFILIATE_MARKER}&trs=${AFFILIATE_PROJECT}&sub_id=eu_es_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1&u=https%3A%2F%2Fwww.kiwi.com%2Fes%2Fsearch%2Fresults%2Fathens-greece%2Fanywhere`, subId: 'eu_es_region_44b6115ebba943b785cbc12ef9f238fa_flight_end_v1' },
        },
        active: true,
        sort_order: 2,
      },
    ],
  },
];

/**
 * Validates a destination batch payload before any dry-run or execution.
 */
export function validateDestinationBatchPayload(payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return { valid: false, error: 'Payload must be a non-empty array' };
  }

  if (payload.length > 5) {
    return { valid: false, error: 'Maximum 5 targets allowed per batch' };
  }

  for (const item of payload) {
    if (!item.target_type || !['country', 'region'].includes(item.target_type)) {
      return { valid: false, error: `Invalid target_type: ${item.target_type}` };
    }
    if (!item.target_key || typeof item.target_key !== 'string') {
      return { valid: false, error: 'target_key must be a non-empty string' };
    }
    if (!Array.isArray(item.promotions) || item.promotions.length < 2 || item.promotions.length > 3) {
      return { valid: false, error: `Target ${item.target_key} must have between 2 and 3 campaigns per target` };
    }

    const campaignIds = new Set();
    for (const promo of item.promotions) {
      if (!promo.campaign_id || campaignIds.has(promo.campaign_id)) {
        return { valid: false, error: `Duplicate or missing campaign_id in target ${item.target_key}` };
      }
      campaignIds.add(promo.campaign_id);

      for (const loc of SUPPORTED_LOCALES) {
        if (!promo.title?.[loc] || typeof promo.title[loc] !== 'string') {
          return { valid: false, error: `Missing ${loc} title for ${promo.campaign_id}` };
        }
        if (!promo.description?.[loc] || typeof promo.description[loc] !== 'string') {
          return { valid: false, error: `Missing ${loc} description for ${promo.campaign_id}` };
        }
        const link = promo.links?.[loc];
        if (!link || typeof link.url !== 'string') {
          return { valid: false, error: `Missing ${loc} link URL for ${promo.campaign_id}` };
        }

        let expectedSubId;
        try {
          expectedSubId = buildDestinationSubId(item.target_type, item.target_key, promo.campaign_id, loc);
        } catch (err) {
          return { valid: false, error: `Invalid subId generation for ${item.target_key}: ${err.message}` };
        }

        if (link.subId && link.subId !== expectedSubId) {
          return { valid: false, error: `sub_id mismatch for ${item.target_key} ${promo.campaign_id} (${loc})` };
        }

        if (!isValidAffiliateUrl(link.url, expectedSubId) || new URL(link.url).hostname !== 'tp.media') {
          return { valid: false, error: `Invalid tracking URL or non-allowlisted destination for ${promo.campaign_id}` };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Execute destination promotions batch in HARD_DRY_RUN (default) or write mode (triple gated).
 */
export async function executeDestinationBatch({
  payload = REPRESENTATIVE_DESTINATION_PAYLOAD,
  apply = false,
  env = process.env,
  client = null,
} = {}) {
  const validation = validateDestinationBatchPayload(payload);
  if (!validation.valid) {
    throw new Error(`Batch payload validation failed: ${validation.error}`);
  }

  const isWriteRequested = Boolean(apply);
  const isWritesEnabled = env.EUVIDA_DB_WRITES_ENABLED === '1';
  const isAllowWriteSecret = env.EUVIDA_PROMOTIONS_ALLOW_WRITE === 'YES_I_UNDERSTAND';

  if (isWriteRequested) {
    if (!isWritesEnabled) {
      throw new Error('Write opt-in required: EUVIDA_DB_WRITES_ENABLED is not set to 1. Refusing to write to database.');
    }
    if (!isAllowWriteSecret) {
      throw new Error('Write opt-in required: EUVIDA_PROMOTIONS_ALLOW_WRITE is not set to YES_I_UNDERSTAND. Refusing to write to database.');
    }
  }

  // DEFAULT / HARD_DRY_RUN mode
  if (!isWriteRequested) {
    const totalPromotions = payload.reduce((acc, item) => acc + item.promotions.length, 0);
    const summary = [
      `[HARD_DRY_RUN] Mode: HARD_DRY_RUN. 0 database rows modified.`,
      `Validated ${payload.length} targets (${payload.map((t) => `${t.target_type}:${t.target_key}`).join(', ')})`,
      `Total campaigns planned: ${totalPromotions} (each with 5 exact locale translations and tp.media links)`,
      `No database mutations performed. Awaiting review and explicit approval.`,
    ].join('\n');

    return {
      mode: 'HARD_DRY_RUN',
      success: true,
      writesPerformed: 0,
      targetCount: payload.length,
      promotionsCount: totalPromotions,
      summary,
    };
  }

  // If write mode were ever permitted with full triple opt-in:
  if (!client) {
    throw new Error('Supabase client with service_role required for database writes.');
  }

  let totalUpsertedPromos = 0;
  for (const item of payload) {
    const targetPayload = {
      target_type: item.target_type,
      target_key: item.target_key,
      region_id: item.target_type === 'region' ? item.target_key : null,
      country_id: item.target_type === 'country' ? item.target_key : null,
      article_id: item.target_type === 'article' ? item.article_id : null,
      article_slug: item.target_type === 'article' ? item.target_key : null,
      updated_at: new Date().toISOString(),
    };

    const { data: targetData, error: targetError } = await client
      .from('promotion_targets')
      .upsert(targetPayload, { onConflict: 'target_type,target_key' })
      .select('id')
      .single();

    if (targetError || !targetData?.id) {
      throw new Error(`Failed to upsert promotion_target for ${item.target_key}: ${targetError?.message}`);
    }

    const targetId = targetData.id;

    for (const promo of item.promotions) {
      const promoRow = {
        target_id: targetId,
        target_type: item.target_type,
        target_key: item.target_key,
        campaign_id: promo.campaign_id,
        provider: promo.provider,
        placement: promo.placement || 'bottom',
        title: promo.title,
        description: promo.description,
        call_to_action: promo.call_to_action || {},
        links: promo.links,
        active: promo.active !== false,
        sort_order: promo.sort_order ?? 0,
        start_at: promo.start_at || null,
        end_at: promo.end_at || null,
        updated_at: new Date().toISOString(),
      };

      const { error: promoError } = await client
        .from('promotions')
        .upsert(promoRow, { onConflict: 'target_id,campaign_id' });

      if (promoError) {
        throw new Error(`Failed to upsert promotion ${promo.campaign_id} for ${item.target_key}: ${promoError.message}`);
      }
      totalUpsertedPromos += 1;
    }
  }

  return {
    mode: 'APPLY',
    success: true,
    writesPerformed: totalUpsertedPromos,
    summary: `Successfully upserted ${totalUpsertedPromos} promotions across ${payload.length} targets.`,
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('destination-promotions-batch.mjs')) {
  const isApply = process.argv.includes('--apply');
  console.log(`[Destination Promotions Batch] Launching in ${isApply ? 'APPLY' : 'HARD_DRY_RUN'} mode...`);

  executeDestinationBatch({
    payload: REPRESENTATIVE_DESTINATION_PAYLOAD,
    apply: isApply,
    env: process.env,
  })
    .then((result) => {
      console.log(result.summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Destination Promotions Batch ERROR] ${err.message}`);
      process.exit(1);
    });
}
