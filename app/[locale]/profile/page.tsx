import ProfileClient from './ProfileClient';
import { supportedLocales } from '@/lib/articleTypes';

export async function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

export default function ProfilePage() {
  return <ProfileClient />;
}
