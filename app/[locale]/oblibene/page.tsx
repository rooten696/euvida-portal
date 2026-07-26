import FavoritesClient from './FavoritesClient';
import { supportedLocales } from '@/lib/articleTypes';

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default function FavoritesPage() {
  return <FavoritesClient />;
}
