import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'
import { getLocalizedUrl } from '@/utils/i18n'

type Props = {
  params: Promise<{ lang: Locale; uuid: string }>
  searchParams: Promise<{ mode?: string }>
}

const RatesEditPage = async ({ params, searchParams }: Props) => {
  const { lang, uuid } = await params
  const { mode } = await searchParams
  const view = mode === 'view' ? '&ver=1' : ''

  redirect(getLocalizedUrl(`/apps/rooms?tab=rates&tarifa=${uuid}${view}`, lang))
}

export default RatesEditPage
