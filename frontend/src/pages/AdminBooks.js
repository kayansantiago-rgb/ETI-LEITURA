import {Link} from 'react-router-dom';
import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import {getUser} from '@/lib/auth';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Edit3, Trash2, Save, X, ListChecks } from 'lucide-react';
import BookQuizEditor from '@/components/BookQuizEditor';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';

const AdminBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBook, setEditingBook] = useState(null);
  const [quizBook, setQuizBook] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    descricao: '',
    capa_url: '',
    arquivo_url: '',
    nivel_ensino: ''
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      // Get all books (as admin we see all)
      const response = await api.get('/books');
      setBooks(response.data);
    } catch (error) {
      toast.error('Erro ao carregar livros');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      titulo: book.titulo,
      autor: book.autor,
      descricao: book.descricao || '',
      capa_url: book.capa_url || '',
      arquivo_url: book.arquivo_url || '',
      nivel_ensino: book.nivel_ensino
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingBook) return;

    setSaving(true);
    try {
      const response = await api.put(`/admin/books/${editingBook.id}`, formData);
      
      // Update local state
      setBooks(books.map(b => b.id === editingBook.id ? { ...b, ...response.data } : b));
      
      toast.success('Livro atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingBook(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar livro');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm('Tem certeza que deseja excluir este livro? Todos os resumos e progressos relacionados também serão excluídos.')) {
      return;
    }

    try {
      await api.delete(`/admin/books/${bookId}`);
      setBooks(books.filter(b => b.id !== bookId));
      toast.success('Livro excluído com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir livro');
    }
  };

  const getNivelBadge = (nivel) => {
    const colors = {
      'FUNDAMENTAL': 'bg-blue-100 text-blue-700',
      'MÉDIO': 'bg-purple-100 text-purple-700',
      'AMBOS': 'bg-green-100 text-green-700'
    };
    const labels = {
      'FUNDAMENTAL': 'Fundamental',
      'MÉDIO': 'Médio',
      'AMBOS': 'Ambos'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[nivel] || 'bg-gray-100 text-gray-700'}`}>
        {labels[nivel] || nivel}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="admin-books-page">
        <PageIntro section="BIBLIOTECA / ACERVO" title="Acervo de livros" description="Organize as leituras que vão chegar aos seus alunos."><Button asChild><Link to="/admin/add-book">Adicionar livro</Link></Button></PageIntro>

        {/* Books List */}
        {books.length === 0 ? (
          <EmptyCollection title="Seu acervo começa aqui" description={<>Nenhum livro cadastrado ainda.</>} action="Adicionar primeiro livro" to="/admin/add-book"/>
        ) : (
          <div className="collection-grid">
            {books.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-stone-100 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Cover */}
                <div className="collection-book-cover relative">
                  <img
                    src={book.capa_url}
                    alt={book.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    {getNivelBadge(book.nivel_ensino)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                    {book.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {book.autor}
                  </p>

                  {/* Actions */}
                  <Button variant="outline" size="sm" className="w-full mb-2" onClick={() => setQuizBook(book)}>
                    <ListChecks className="h-3 w-3 mr-1" />
                    Questionário e certificado
                  </Button>
                  {getUser()?.role==='admin'&&<div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(book)}
                      data-testid={`edit-book-${book.id}`}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(book.id)}
                      data-testid={`delete-book-${book.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Livro</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="edit-titulo">Título</Label>
                <Input
                  id="edit-titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-autor">Autor</Label>
                <Input
                  id="edit-autor"
                  value={formData.autor}
                  onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea
                  id="edit-descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-nivel">Nível de Ensino</Label>
                <Select
                  value={formData.nivel_ensino}
                  onValueChange={(value) => setFormData({ ...formData, nivel_ensino: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="edit-nivel-ensino">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AMBOS">Ambos (Fundamental e Médio)</SelectItem>
                    <SelectItem value="FUNDAMENTAL">Apenas Ensino Fundamental</SelectItem>
                    <SelectItem value="MÉDIO">Apenas Ensino Médio</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  O livro só aparecerá para alunos do nível selecionado
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg"
                  data-testid="save-book-button"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  className="rounded-lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {quizBook && <BookQuizEditor book={quizBook} onClose={() => setQuizBook(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default AdminBooks;
