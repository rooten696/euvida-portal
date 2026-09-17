export type LegalLocale = 'cs' | 'en' | 'de' | 'es' | 'fr';

export type LegalPageContent = {
  title: string;
  intro: string;
  updated: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

const commonUpdated = '9. 8. 2026';

export const legalPages: Record<LegalLocale, {
  privacy: LegalPageContent;
  terms: LegalPageContent;
  contact: LegalPageContent;
  links: {
    privacy: string;
    terms: string;
    contact: string;
  };
}> = {
  cs: {
    links: { privacy: 'Soukromí', terms: 'Podmínky', contact: 'Kontakt' },
    privacy: {
      title: 'Ochrana soukromí',
      intro: 'Euvida.eu je informační cestovatelský portál. Osobní údaje zpracováváme jen v rozsahu nutném pro provoz webu, zabezpečení, komunikaci a základní měření návštěvnosti.',
      updated: commonUpdated,
      sections: [
        { heading: 'Jaké údaje můžeme zpracovávat', body: ['Při návštěvě webu se mohou zpracovávat technické údaje jako IP adresa, typ zařízení, prohlížeč, čas návštěvy a navštívené stránky. Pokud nám napíšete e-mail, zpracujeme údaje uvedené ve zprávě, abychom mohli odpovědět.'] },
        { heading: 'Cookies, měření a partnerské služby', body: ['Web používá nezbytné cookies pro správné fungování a analytické nástroje (např. Google Analytics) pro pochopení návštěvnosti a zlepšování obsahu. Na stránkách se mohou nacházet také partnerské a affiliate prvky (např. Travelpayouts), které mohou při interakci využívat technické identifikátory pro měření zprostředkování.', 'Cookies lze omezit nebo smazat v nastavení prohlížeče. Pokud v cookie liště odmítnete volitelné cookies, předává se základní signál nesouhlasu pro analytické a reklamní úložiště podle nastavení vašeho souhlasu.'] },
        { heading: 'Externí odkazy a zdroje', body: ['Články mohou odkazovat na oficiální weby provozovatelů, turistické portály, mapy a další externí zdroje. Za jejich obsah, dostupnost a zásady ochrany soukromí odpovídají jejich provozovatelé.'] },
        { heading: 'Kontakt', body: ['Dotazy k ochraně soukromí posílejte na euvida@seznam.cz.'] },
      ],
    },
    terms: {
      title: 'Podmínky používání',
      intro: 'Používáním webu Euvida.eu souhlasíte s tím, že obsah slouží jako cestovatelská inspirace a praktický informační přehled.',
      updated: commonUpdated,
      sections: [
        { heading: 'Informační charakter obsahu', body: ['Snažíme se pracovat s ověřenými zdroji, ale ceny, otevírací doby, dopravní spojení, kvalita vody a pravidla vstupu se mohou měnit. Před cestou si vždy ověřte aktuální stav u oficiálního provozovatele nebo příslušného úřadu.'] },
        { heading: 'Autorská práva a obrázky', body: ['Texty, struktura webu a vlastní grafika jsou chráněny autorským právem. U převzatých obrázků uvádíme zdroje a licence tam, kde jsou dostupné. Ilustrační obrázky jsou označovány jako ilustrační.'] },
        { heading: 'Redakční kontrola', body: ['Obsah průběžně kontrolujeme a opíráme ho o dostupné zdroje. I tak doporučujeme aktuální praktické údaje ověřit u primárního zdroje.'] },
        { heading: 'Odpovědnost', body: ['Web nenahrazuje oficiální návštěvní řády, bezpečnostní pokyny, dopravní informace ani právní doporučení. Cestování a sportovní aktivity podnikáte na vlastní odpovědnost.'] },
      ],
    },
    contact: {
      title: 'Kontakt',
      intro: 'Máte opravu, tip na zajímavé místo, dotaz ke zdrojům nebo nabídku spolupráce? Napište nám.',
      updated: commonUpdated,
      sections: [
        { heading: 'E-mail', body: ['euvida@seznam.cz'] },
        { heading: 'Opravy a doplnění', body: ['U oprav prosím pošlete odkaz na článek, stručný popis chyby a ideálně odkaz na oficiální zdroj. Pomůže nám to rychleji ověřit změnu.'] },
        { heading: 'Redakční poznámka', body: ['Euvida.eu postupně buduje vícejazyčný cestovatelský přehled Evropy. Prioritou jsou praktické informace, ověřitelné zdroje a obsah použitelný pro reálné plánování cesty.'] },
      ],
    },
  },
  en: {
    links: { privacy: 'Privacy', terms: 'Terms', contact: 'Contact' },
    privacy: {
      title: 'Privacy Policy',
      intro: 'Euvida.eu is an informational travel portal. We process personal data only where needed to run the website, keep it secure, communicate with readers and understand basic traffic.',
      updated: commonUpdated,
      sections: [
        { heading: 'Data we may process', body: ['When you visit the site, technical data such as IP address, device type, browser, visit time and viewed pages may be processed. If you contact us by e-mail, we process the information in your message so we can reply.'] },
        { heading: 'Cookies, analytics and partner services', body: ['The website uses essential cookies for proper functionality and analytics tools (such as Google Analytics) to understand traffic and improve content. The site may also include partner and affiliate elements (such as Travelpayouts), which may process technical identifiers upon interaction for referral measurement.', 'You can restrict or delete cookies in your browser settings. If you reject optional cookies in the cookie banner, a basic denied consent signal is applied for analytics and advertising storage in accordance with your consent preferences.'] },
        { heading: 'External links and sources', body: ['Articles may link to official operators, tourism portals, maps and other external sources. Their content, availability and privacy rules are controlled by their operators.'] },
        { heading: 'Contact', body: ['Privacy questions can be sent to euvida@seznam.cz.'] },
      ],
    },
    terms: {
      title: 'Terms of Use',
      intro: 'By using Euvida.eu, you accept that the content is travel inspiration and a practical information overview.',
      updated: commonUpdated,
      sections: [
        { heading: 'Informational content', body: ['We aim to work with verified sources, but prices, opening hours, transport, water quality and access rules can change. Always check current information with the official operator or authority before travelling.'] },
        { heading: 'Copyright and images', body: ['Texts, website structure and original graphics are protected by copyright. For third-party images, we provide sources and licence information where available. Illustrative images are marked as illustrative.'] },
        { heading: 'Editorial review', body: ['We review content continuously and base it on available sources. Current practical details should still be checked against the primary source.'] },
        { heading: 'Liability', body: ['The website does not replace official visitor rules, safety instructions, transport information or legal advice. Travel and sports activities are undertaken at your own risk.'] },
      ],
    },
    contact: {
      title: 'Contact',
      intro: 'Have a correction, a tip for a place, a question about sources or a cooperation idea? Write to us.',
      updated: commonUpdated,
      sections: [
        { heading: 'E-mail', body: ['euvida@seznam.cz'] },
        { heading: 'Corrections', body: ['For corrections, please include the article link, a short description of the issue and, ideally, an official source. This helps us verify updates faster.'] },
        { heading: 'Editorial note', body: ['Euvida.eu is gradually building a multilingual travel overview of Europe with a focus on practical information, verifiable sources and content useful for real trip planning.'] },
      ],
    },
  },
  de: {
    links: { privacy: 'Datenschutz', terms: 'Bedingungen', contact: 'Kontakt' },
    privacy: {
      title: 'Datenschutz',
      intro: 'Euvida.eu ist ein informativer Reiseguide. Personenbezogene Daten verarbeiten wir nur, soweit es fuer Betrieb, Sicherheit, Kommunikation und grundlegende Reichweitenmessung erforderlich ist.',
      updated: commonUpdated,
      sections: [
        { heading: 'Welche Daten verarbeitet werden koennen', body: ['Beim Besuch der Website koennen technische Daten wie IP-Adresse, Geraetetyp, Browser, Besuchszeit und aufgerufene Seiten verarbeitet werden. Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir die Angaben aus Ihrer Nachricht zur Beantwortung.'] },
        { heading: 'Cookies, Analyse und Partnerdienste', body: ['Die Website verwendet notwendige Cookies fuer den ordnungsgemaessen Betrieb und Analysewerkzeuge (wie Google Analytics) zum Verstaendnis der Besucherzahlen und zur Verbesserung der Inhalte. Auf den Seiten koennen sich auch Partner- und Affiliate-Elemente (wie Travelpayouts) befinden, die bei Interaktion technische Kennungen zur Vermittlungsmessung verarbeiten koennen.', 'Cookies koennen Sie in den Browsereinstellungen einschraenken oder loeschen. Wenn Sie optionale Cookies im Cookie-Banner ablehnen, wird ein grundlegendes Ablehnungssignal fuer Analyse- und Werbespeicher gemaess Ihren Einstellungen uebermittelt.'] },
        { heading: 'Externe Links und Quellen', body: ['Artikel koennen auf offizielle Betreiber, Tourismusportale, Karten und andere externe Quellen verlinken. Fuer deren Inhalte, Verfuegbarkeit und Datenschutzregeln sind die jeweiligen Betreiber verantwortlich.'] },
        { heading: 'Kontakt', body: ['Fragen zum Datenschutz senden Sie bitte an euvida@seznam.cz.'] },
      ],
    },
    terms: {
      title: 'Nutzungsbedingungen',
      intro: 'Mit der Nutzung von Euvida.eu akzeptieren Sie, dass die Inhalte als Reiseinspiration und praktische Informationsuebersicht dienen.',
      updated: commonUpdated,
      sections: [
        { heading: 'Informativer Charakter', body: ['Wir arbeiten moeglichst mit geprueften Quellen. Preise, Oeffnungszeiten, Verkehr, Wasserqualitaet und Zutrittsregeln koennen sich jedoch aendern. Pruefen Sie aktuelle Angaben vor der Reise immer beim offiziellen Betreiber oder der zustaendigen Behoerde.'] },
        { heading: 'Urheberrecht und Bilder', body: ['Texte, Seitenstruktur und eigene Grafiken sind urheberrechtlich geschuetzt. Bei uebernommenen Bildern nennen wir Quellen und Lizenzen, soweit verfuegbar. Illustrative Bilder werden als illustrativ gekennzeichnet.'] },
        { heading: 'Redaktionelle Pruefung', body: ['Wir pruefen Inhalte laufend und stuetzen sie auf verfuegbare Quellen. Aktuelle praktische Details sollten trotzdem an der Primaerquelle kontrolliert werden.'] },
        { heading: 'Haftung', body: ['Die Website ersetzt keine offiziellen Besucherordnungen, Sicherheitshinweise, Verkehrsinformationen oder Rechtsberatung. Reisen und sportliche Aktivitaeten erfolgen auf eigene Verantwortung.'] },
      ],
    },
    contact: {
      title: 'Kontakt',
      intro: 'Haben Sie eine Korrektur, einen Tipp fuer einen Ort, eine Frage zu Quellen oder eine Kooperationsidee? Schreiben Sie uns.',
      updated: commonUpdated,
      sections: [
        { heading: 'E-Mail', body: ['euvida@seznam.cz'] },
        { heading: 'Korrekturen', body: ['Bitte senden Sie bei Korrekturen den Artikellink, eine kurze Fehlerbeschreibung und moeglichst eine offizielle Quelle. So koennen wir Aenderungen schneller pruefen.'] },
        { heading: 'Redaktioneller Hinweis', body: ['Euvida.eu baut schrittweise einen mehrsprachigen Reiseueberblick fuer Europa auf, mit Fokus auf praktische Informationen, pruefbare Quellen und Inhalte fuer echte Reiseplanung.'] },
      ],
    },
  },
  es: {
    links: { privacy: 'Privacidad', terms: 'Condiciones', contact: 'Contacto' },
    privacy: {
      title: 'Privacidad',
      intro: 'Euvida.eu es un portal informativo de viajes. Tratamos datos personales solo cuando es necesario para operar el sitio, mantenerlo seguro, comunicarnos y medir el trafico basico.',
      updated: commonUpdated,
      sections: [
        { heading: 'Datos que podemos tratar', body: ['Al visitar el sitio pueden tratarse datos tecnicos como direccion IP, tipo de dispositivo, navegador, hora de visita y paginas vistas. Si nos escribes por e-mail, tratamos la informacion del mensaje para poder responder.'] },
        { heading: 'Cookies, analitica y servicios asociados', body: ['El sitio web utiliza cookies necesarias para su correcto funcionamiento y herramientas de analitica (como Google Analytics) para comprender el trafico y mejorar el contenido. El sitio tambien puede incluir elementos de socios y afiliados (como Travelpayouts), que pueden procesar identificadores tecnicos al interactuar para medir la intermediacion.', 'Puedes restringir o eliminar las cookies en la configuracion de tu navegador. Si rechazas las cookies opcionales en el banner de cookies, se envia una senal basica de denegacion de consentimiento para el almacenamiento publicitario y analitico segun tus preferencias.'] },
        { heading: 'Enlaces y fuentes externas', body: ['Los articulos pueden enlazar a operadores oficiales, portales turisticos, mapas y otras fuentes externas. Su contenido, disponibilidad y normas de privacidad dependen de sus operadores.'] },
        { heading: 'Contacto', body: ['Las preguntas sobre privacidad se pueden enviar a euvida@seznam.cz.'] },
      ],
    },
    terms: {
      title: 'Condiciones de uso',
      intro: 'Al utilizar Euvida.eu aceptas que el contenido es inspiracion de viaje y una guia practica de informacion.',
      updated: commonUpdated,
      sections: [
        { heading: 'Contenido informativo', body: ['Intentamos trabajar con fuentes verificadas, pero precios, horarios, transporte, calidad del agua y normas de acceso pueden cambiar. Antes de viajar, comprueba siempre la informacion actual con el operador oficial o la autoridad competente.'] },
        { heading: 'Derechos de autor e imagenes', body: ['Los textos, la estructura del sitio y los graficos propios estan protegidos por derechos de autor. En imagenes de terceros indicamos fuentes y licencias cuando estan disponibles. Las imagenes ilustrativas se marcan como ilustrativas.'] },
        { heading: 'Revision editorial', body: ['Revisamos el contenido de forma continua y lo basamos en fuentes disponibles. Aun asi, los datos practicos actuales deben comprobarse en la fuente primaria.'] },
        { heading: 'Responsabilidad', body: ['El sitio no sustituye normas oficiales de visita, instrucciones de seguridad, informacion de transporte ni asesoramiento legal. Los viajes y actividades deportivas se realizan bajo tu propia responsabilidad.'] },
      ],
    },
    contact: {
      title: 'Contacto',
      intro: 'Tienes una correccion, una recomendacion de lugar, una pregunta sobre fuentes o una idea de colaboracion? Escribenos.',
      updated: commonUpdated,
      sections: [
        { heading: 'E-mail', body: ['euvida@seznam.cz'] },
        { heading: 'Correcciones', body: ['Para correcciones, incluye el enlace del articulo, una breve descripcion del problema y, si es posible, una fuente oficial. Esto nos ayuda a verificar cambios mas rapido.'] },
        { heading: 'Nota editorial', body: ['Euvida.eu esta construyendo gradualmente una guia multilingue de Europa centrada en informacion practica, fuentes verificables y contenido util para planificar viajes reales.'] },
      ],
    },
  },
  fr: {
    links: { privacy: 'Confidentialite', terms: 'Conditions', contact: 'Contact' },
    privacy: {
      title: 'Confidentialite',
      intro: 'Euvida.eu est un portail de voyage informatif. Nous traitons les donnees personnelles uniquement lorsque cela est necessaire au fonctionnement du site, a sa securite, a la communication et a la mesure de base de l audience.',
      updated: commonUpdated,
      sections: [
        { heading: 'Donnees pouvant etre traitees', body: ['Lors de votre visite, des donnees techniques comme l adresse IP, le type d appareil, le navigateur, l heure de visite et les pages consultees peuvent etre traitees. Si vous nous contactez par e-mail, nous traitons les informations de votre message afin de vous repondre.'] },
        { heading: 'Cookies, mesure d audience et services partenaires', body: ['Le site utilise des cookies necessaires a son bon fonctionnement et des outils de mesure d audience (tels que Google Analytics) pour comprendre la frequentation et ameliorer le contenu. Le site peut egalement inclure des elements partenaires et d affiliation (tels que Travelpayouts), qui peuvent traiter des identifiants techniques lors des interactions pour mesurer l apport d affaires.', 'Vous pouvez limiter ou supprimer les cookies dans les parametres de votre navigateur. Si vous refusez les cookies optionnels dans le bandeau de cookies, un signal de refus de base est transmis pour le stockage analytique et publicitaire conformement a vos preferences de consentement.'] },
        { heading: 'Liens et sources externes', body: ['Les articles peuvent renvoyer vers des exploitants officiels, portails touristiques, cartes et autres sources externes. Leur contenu, disponibilite et regles de confidentialite relevent de leurs exploitants.'] },
        { heading: 'Contact', body: ['Les questions relatives a la confidentialite peuvent etre envoyees a euvida@seznam.cz.'] },
      ],
    },
    terms: {
      title: 'Conditions d utilisation',
      intro: 'En utilisant Euvida.eu, vous acceptez que le contenu serve d inspiration de voyage et de guide pratique d information.',
      updated: commonUpdated,
      sections: [
        { heading: 'Contenu informatif', body: ['Nous essayons de travailler avec des sources verifiees, mais les prix, horaires, transports, qualite de l eau et regles d acces peuvent changer. Avant de voyager, verifiez toujours les informations actuelles aupres de l exploitant officiel ou de l autorite competente.'] },
        { heading: 'Droits d auteur et images', body: ['Les textes, la structure du site et les graphismes originaux sont proteges par le droit d auteur. Pour les images tierces, nous indiquons les sources et licences lorsqu elles sont disponibles. Les images illustratives sont signalees comme illustratives.'] },
        { heading: 'Verification editoriale', body: ['Nous verifions le contenu de maniere continue et nous l appuyons sur les sources disponibles. Les details pratiques actuels doivent malgre tout etre controles a la source primaire.'] },
        { heading: 'Responsabilite', body: ['Le site ne remplace pas les reglements officiels de visite, consignes de securite, informations de transport ou conseils juridiques. Les voyages et activites sportives se font sous votre propre responsabilite.'] },
      ],
    },
    contact: {
      title: 'Contact',
      intro: 'Vous avez une correction, une idee de lieu, une question sur les sources ou une proposition de cooperation ? Ecrivez-nous.',
      updated: commonUpdated,
      sections: [
        { heading: 'E-mail', body: ['euvida@seznam.cz'] },
        { heading: 'Corrections', body: ['Pour une correction, merci d inclure le lien de l article, une breve description du probleme et, si possible, une source officielle. Cela nous aide a verifier les mises a jour plus vite.'] },
        { heading: 'Note editoriale', body: ['Euvida.eu construit progressivement un guide de voyage multilingue de l Europe, avec un accent sur les informations pratiques, les sources verifiables et le contenu utile pour planifier de vrais trajets.'] },
      ],
    },
  },
};

export function getLegalLocale(locale: string): LegalLocale {
  return ['cs', 'en', 'de', 'es', 'fr'].includes(locale) ? (locale as LegalLocale) : 'cs';
}
