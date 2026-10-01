import TextCorrectionPage from '@/components/TextCorrectionPage';

export default function AdminTextProductions() {
  return (
    <TextCorrectionPage
      kind="production"
      path="/admin/text-productions"
      testId="admin-productions-page"
      section="APRENDIZAGEM / ESCRITA"
      title="Produções textuais"
      description="Acompanhe a escrita dos alunos, corrija com critérios e envie orientações."
    />
  );
}
