import { redirect } from 'next/navigation';

/** Customer app entry — same flow as the former /ride module in the driver monolith. */
export default function HomePage() {
  redirect('/ride');
}
