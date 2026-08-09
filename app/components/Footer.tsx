import Link from 'next/link';
import { getLegalLocale, legalPages } from '@/lib/legalPages';

type FooterProps = {
  locale?: string;
};

const aiContentNotice: Record<string, string> = {
  cs: 'Část obsahu a některé ilustrační obrázky mohou být připravovány s pomocí AI a procházejí redakční kontrolou.',
  en: 'Some content and selected illustrative images may be prepared with AI assistance and are editorially reviewed.',
  de: 'Ein Teil der Inhalte und ausgewählte illustrative Bilder können mit KI-Unterstützung erstellt werden und werden redaktionell geprüft.',
  fr: 'Une partie du contenu et certaines images illustratives peuvent être préparées avec l’aide de l’IA et font l’objet d’une vérification éditoriale.',
  es: 'Parte del contenido y algunas imágenes ilustrativas pueden prepararse con ayuda de IA y pasan por revisión editorial.',
};

export default function Footer({ locale = 'cs' }: FooterProps) {
  const notice = aiContentNotice[locale] ?? aiContentNotice.cs;
  const legalLocale = getLegalLocale(locale);
  const legalLinks = legalPages[legalLocale].links;

  return (
    <footer className="w-full border-t border-white/5 bg-slate-900/60 backdrop-blur-md py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo a popisek */}
          <div>
            <div className="text-lg font-black tracking-tight text-white flex items-center justify-center md:justify-start">
              EU<span className="text-emerald-400">VIDA</span><span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded ml-1">.EU</span>
            </div>
            <p className="mt-2 text-sm text-slate-400 max-w-md text-center md:text-left">
              Váš ultimátní průvodce pro cestování po Evropě.
            </p>
          </div>

          {/* Odkazy (zarovnáno doprava na desktopu) */}
          <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2 text-sm text-slate-400 font-medium">
            <Link href={`/${locale}`} className="hover:text-emerald-400 transition-colors">Domů</Link>
            <Link href={`/${locale}/oblibene`} className="hover:text-emerald-400 transition-colors">Oblíbené</Link>
            <Link href={`/${locale}/profile`} className="hover:text-emerald-400 transition-colors">Profil</Link>
            <Link href={`/${locale}/about`} className="hover:text-emerald-400 transition-colors">O nás</Link>
            <Link href={`/${locale}/privacy`} className="hover:text-emerald-400 transition-colors">{legalLinks.privacy}</Link>
            <Link href={`/${locale}/terms`} className="hover:text-emerald-400 transition-colors">{legalLinks.terms}</Link>
            <Link href={`/${locale}/contact`} className="hover:text-emerald-400 transition-colors">{legalLinks.contact}</Link>
          </div>
        </div>

        {/* Spodní linka - Copyright */}
        <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="max-w-2xl text-center md:text-left">
            <div>&copy; {new Date().getFullYear()} EUVIDA.eu. Všechna práva vyhrazena.</div>
            <div className="mt-2 text-slate-400">{notice}</div>
          </div>
          <div className="flex gap-4">
            <span className="cursor-pointer hover:text-white transition-colors">Instagram</span>
            <span className="cursor-pointer hover:text-white transition-colors">Facebook</span>
            <span className="cursor-pointer hover:text-white transition-colors">X (Twitter)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
