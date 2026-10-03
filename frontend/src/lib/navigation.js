import {
  Video,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  FileText,
  PenTool,
  Users,
  ImageIcon,
  CalendarDays,
  Library,
  GraduationCap,
  ClipboardList,
  ClipboardCheck,
  ChartColumn,
  Trophy,
  UserCog,
  ListChecks,
  Bell
} from 'lucide-react';

// Menu organizado pelo que cada perfil quer fazer. [ícone, nome, caminho, cor]
export function navGroups(user) {
  const admin = user?.role === 'admin';
  if (['admin', 'teacher'].includes(user?.role))
    return [
      ['Início', [[LayoutDashboard, 'Seu dia', '/dashboard', 'violet'], [GraduationCap, 'Painel do professor', '/admin/professor', 'violet']]],
      [
        'Ensinar',
        [
          [ClipboardList, 'Atividades', '/admin/activities', 'violet'],
          [Sparkles, 'Quizzes', '/quizzes', 'pink'],
          [Video, 'Vídeos e materiais', '/videos', 'blue'],
          [Library, 'Livros', '/admin/books', 'teal'],
          [ListChecks, 'Critérios de correção', '/admin/rubrics', 'amber']
        ]
      ],
      [
        'Acompanhar',
        [
          [ClipboardCheck, 'Pendências de correção', '/workspace', 'amber'],
          [Users, 'Minhas turmas', '/admin/classes', 'violet'],
          [FileText, 'Resumos', '/admin/summaries', 'blue'],
          [PenTool, 'Produções textuais', '/admin/text-productions', 'pink'],
          [ChartColumn, 'Relatórios', '/admin/reports', 'teal'],
          [Trophy, 'Ranking de leitores', '/ranking', 'amber']
        ]
      ],
      [
        'Escola',
        [
          [BookOpen, 'Biblioteca', '/library', 'teal'],
          [ImageIcon, 'Mural', '/admin/mural', 'pink'],
          [CalendarDays, 'Calendário', '/admin/calendar', 'blue'],
          [Bell, 'Avisos', '/notifications', 'amber'],
          ...(admin ? [[UserCog, 'Professores', '/admin/teachers', 'violet']] : [])
        ]
      ]
    ];
  return [
    ['Início', [[LayoutDashboard, 'Visão geral', '/dashboard', 'violet']]],
    ['Ler', [[BookOpen, 'Biblioteca', '/library', 'teal'], [FileText, 'Meus resumos', '/summaries', 'blue'], [Trophy, 'Ranking de leitores', '/ranking', 'amber']]],
    [
      'Estudar',
      [
        [ClipboardList, 'Minhas atividades', '/activities', 'violet'],
        [ClipboardCheck, 'Pendências', '/workspace', 'amber'],
        [Sparkles, 'Quizzes', '/quizzes', 'pink'],
        [Video, 'Vídeos e materiais', '/videos', 'blue']
      ]
    ],
    ['Escrever', [[PenTool, 'Produção textual', '/text-productions', 'pink']]],
    ['Escola', [[Bell, 'Avisos', '/notifications', 'amber']]]
  ];
}

// Atalhos da barra inferior do celular (o 5º botão é "Mais").
export function dockLinks(user) {
  if (['admin', 'teacher'].includes(user?.role))
    return [
      [LayoutDashboard, 'Início', '/dashboard'],
      [Users, 'Turmas', '/admin/classes'],
      [ClipboardList, 'Atividades', '/admin/activities'],
      [ClipboardCheck, 'Corrigir', '/workspace']
    ];
  return [
    [LayoutDashboard, 'Início', '/dashboard'],
    [BookOpen, 'Livros', '/library'],
    [ClipboardList, 'Atividades', '/activities'],
    [PenTool, 'Escrita', '/text-productions']
  ];
}
