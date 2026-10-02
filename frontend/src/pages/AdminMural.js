import { getUser } from '@/lib/auth';
import PageIntro from '@/components/PageIntro';
import EmptyCollection from '@/components/EmptyCollection';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Image as ImageIcon, Video, Upload, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminMural = () => {
  const [posts, setPosts] = useState([]);
  const [filter,setFilter]=useState('todos');
  const visiblePosts=posts.filter(p=>filter==='todos'||p.tipo===filter);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    tipo: 'foto',
    titulo: '',
    url_media: '',
    descricao: ''
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await api.get('/mural');
      setPosts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar mural');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      const response = await api.post('/admin/mural/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setFormData({ ...formData, url_media: response.data.url });
      toast.success('Imagem enviada!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar imagem');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.url_media) {
      toast.error(formData.tipo === 'foto' ? 'Selecione uma imagem' : 'Insira o link do vídeo');
      return;
    }

    try {
      await api.post('/admin/mural', formData);
      toast.success('Post adicionado ao mural!');
      setDialogOpen(false);
      resetForm();
      loadPosts();
    } catch (error) {
      toast.error('Erro ao adicionar post');
    }
  };

  const resetForm = () => {
    setFormData({ tipo: 'foto', titulo: '', url_media: '', descricao: '' });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm('Deseja excluir este post do mural?')) {
      try {
        await api.delete(`/admin/mural/${postId}`);
        setPosts(posts.filter(p => p.id !== postId));
        toast.success('Post excluído!');
      } catch (error) {
        toast.error('Erro ao excluir');
      }
    }
  };

  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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
      <div data-testid="admin-mural-page">
        <div className="inner-toolbar-heading">
          <PageIntro section="COMUNIDADE / PUBLICAÇÕES" title="Mural da escola" description="As histórias da sua comunidade merecem ser compartilhadas."/>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-lg" data-testid="new-post-button">
                <Plus className="h-4 w-4 mr-2" />
                Nova publicação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar publicação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo: value, url_media: '' });
                      setImagePreview(null);
                    }}
                  >
                    <SelectTrigger id="tipo" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="foto">Foto</SelectItem>
                      <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Dia da Leitura 2026"
                    required
                  />
                </div>

                {/* Photo Upload */}
                {formData.tipo === 'foto' && (
                  <div>
                    <Label>Foto *</Label>
                    <div className="mt-2 space-y-3">
                      {/* File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="mural-image-upload"
                      />
                      
                      {/* Upload Area */}
                      {!imagePreview && !formData.url_media ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInputRef.current?.click();}}} className="publication-upload"
                        >
                          {uploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-8 w-8 text-primary animate-spin" />
                              <p className="text-sm text-muted-foreground">Enviando...</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Clique para selecionar uma imagem
                              </p>
                              <p className="text-xs text-muted-foreground">
                                JPG, PNG, GIF ou WebP. Máximo 10MB.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={imagePreview || formData.url_media}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setImagePreview(null);
                              setFormData({ ...formData, url_media: '' });
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Video URL */}
                {formData.tipo === 'video' && (
                  <div>
                    <Label htmlFor="url_media">Link do Vídeo (YouTube) *</Label>
                    <Input
                      id="url_media"
                      type="url"
                      value={formData.url_media}
                      onChange={(e) => setFormData({ ...formData, url_media: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                    {formData.url_media && getYoutubeId(formData.url_media) && (
                      <div className="mt-3 aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYoutubeId(formData.url_media)}`}
                          className="w-full h-full"
                          allowFullScreen
                          title="Preview"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Adicione uma descrição..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="rounded-lg" disabled={uploading}>
                    Adicionar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg">
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mural-overview"><div><span>PUBLICAÇÕES</span><strong>{posts.length.toString().padStart(2,'0')}</strong></div><div><ImageIcon size={18}/><span>Fotos</span><strong>{posts.filter(p=>p.tipo==='foto').length}</strong></div><div><Video size={18}/><span>Vídeos</span><strong>{posts.filter(p=>p.tipo==='video').length}</strong></div><p>Um registro vivo das leituras,<br/>encontros e descobertas da escola.</p></div>
        <div className="collection-bar"><div><h2>Publicações da comunidade</h2><p>Conteúdos que aparecem no início da plataforma.</p></div><div className="collection-tabs" aria-label="Filtrar publicações">{[['todos','Todas'],['foto','Fotos'],['video','Vídeos']].map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
        {visiblePosts.length === 0 ? (
          <EmptyCollection icon={ImageIcon} title={posts.length?'Nenhuma publicação neste formato':'O próximo capítulo é da sua escola.'} description={posts.length?'Escolha outro filtro ou compartilhe um novo conteúdo.':'Uma roda de leitura, um projeto especial ou uma descoberta em sala. Publique o primeiro momento da comunidade.'} action="Criar publicação" onAction={()=>{resetForm();setDialogOpen(true);}}/>
        ) : (
          <div className="mural-publications">
            {visiblePosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="publication-card"
              >
                {/* Media */}
                <div className="aspect-video bg-muted relative group">
                  {post.tipo === 'foto' ? (
                    <img src={post.url_media} alt={post.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYoutubeId(post.url_media)}`}
                      className="w-full h-full"
                      allowFullScreen
                      title={post.titulo}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {post.tipo === 'foto' ? (
                        <ImageIcon className="h-4 w-4 text-primary" />
                      ) : (
                        <Video className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-xs font-medium text-primary uppercase">{post.tipo}</span>
                    </div>
                    {(getUser()?.role === 'admin' || post.autor_id === getUser()?.id) && <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(post.id)}
                      data-testid={`delete-mural-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{post.titulo}</h3>
                  {post.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(post.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminMural;
