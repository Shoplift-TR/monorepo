import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('nav');
  
  return (
    <div className="flex min-h-[80vh] items-center justify-center font-sans">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-linear-to-r from-black via-zinc-600 to-zinc-400">
          Shoplift — Coming Soon
        </h1>
        <p className="text-zinc-500 font-medium">
          {t('home')}
        </p>
      </div>
    </div>
  );
}
