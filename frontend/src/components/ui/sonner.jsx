import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react"

// Avisos rápidos ("Salvo!", "Erro…") com o visual da ETI LEITURA: ícone em bloco colorido e barra lateral.
const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CheckCircle2 size={18} />,
        error: <XCircle size={18} />,
        warning: <AlertTriangle size={18} />,
        info: <Info size={18} />,
        loading: <Loader2 size={18} className="animate-spin" />,
      }}
      toastOptions={{ classNames: { toast: "eti-toast", title: "eti-toast-title", description: "eti-toast-desc", icon: "eti-toast-icon", closeButton: "eti-toast-close" } }}
      {...props} />
  );
}

export { Toaster, toast }
