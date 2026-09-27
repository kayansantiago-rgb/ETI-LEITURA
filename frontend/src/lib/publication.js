export const publicationLabel=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'';
export const publicationInput=value=>value?new Date(new Date(value).getTime()-3*60*60*1000).toISOString().slice(0,16):'';
