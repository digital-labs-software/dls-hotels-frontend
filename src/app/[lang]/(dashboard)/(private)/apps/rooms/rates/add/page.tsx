import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'
import { getLocalizedUrl } from '@/utils/i18n'

type Props = {
  params: Promise<{ lang: Locale }>
}

const RatesAddPage = async ({ params }: Props) => {
  const { lang } = await params

  redirect(getLocalizedUrl('/apps/rooms?tab=rates&nueva=1', lang))
}

export default RatesAddPage
