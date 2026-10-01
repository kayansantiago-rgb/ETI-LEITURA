import TextCorrectionPage from '@/components/TextCorrectionPage';

export default function AdminSummaries() {
  return (
    <TextCorrectionPage
      kind="summary"
      path="/admin/summaries"
      testId="admin-summaries-page"
      section="APRENDIZAGEM / LEITURA"
      title="Resumos dos alunos"
      description="Leia os resumos, atribua a nota e devolva um comentário sem sair da página."
    />
  );
}
