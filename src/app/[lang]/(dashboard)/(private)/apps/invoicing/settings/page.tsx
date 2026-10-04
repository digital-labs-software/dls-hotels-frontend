import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ lang: string }>
}

const InvoicingSettingsRedirect = async ({ params }: Props) => {
  const { lang } = await params

  redirect(`/${lang}/apps/hotel/einvoice`)
}

export default InvoicingSettingsRedirect
