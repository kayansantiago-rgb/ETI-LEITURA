"""Generate persistent VAPID keys in backend/.env without printing secrets."""
from pathlib import Path
import base64
from dotenv import dotenv_values, set_key
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

path = Path(__file__).resolve().parents[1] / 'backend' / '.env'
values = dotenv_values(path)
if values.get('VAPID_PRIVATE_KEY') or values.get('VAPID_PUBLIC_KEY'):
    if not (values.get('VAPID_PRIVATE_KEY') and values.get('VAPID_PUBLIC_KEY')):
        raise SystemExit('Configuracao incompleta. Preserve a chave existente e revise o par antes de continuar.')
    print('Chaves existentes preservadas.')
else:
    key = ec.generate_private_key(ec.SECP256R1())
    private = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    public = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    for name, raw in [('VAPID_PRIVATE_KEY',private),('VAPID_PUBLIC_KEY',public)]:
        set_key(str(path), name, base64.urlsafe_b64encode(raw).decode().rstrip('='))
    print('Chaves salvas no backend/.env; nenhum segredo exibido.')
print('Para ativar, configure PUBLIC_APP_URL com o endereco HTTPS publicado ou VAPID_SUBJECT com o contato real da escola.')
