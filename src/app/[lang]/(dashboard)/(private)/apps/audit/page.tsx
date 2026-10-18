import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ lang: string }>
}

const AuditRedirectPage = async ({ params }: Props) => {
  const { lang } = await params

  redirect(`/${lang}/apps/reports?tab=audit`)
}

export default AuditRedirectPage
