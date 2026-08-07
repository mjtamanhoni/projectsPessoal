type Handler = (visivel: boolean, msg: string) => void;

let handler: Handler | null = null;
let contador = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export function setAguardeHandler(h: Handler) {
  handler = h;
}

export function aguarde(msg: string, ms = 300) {
  contador++;
  if (contador === 1) {
    timer = setTimeout(() => handler?.(true, msg), ms);
  } else if (timer === null) {
    handler?.(true, msg);
  }
}

export function aguardePronto() {
  if (contador > 0) contador--;
  if (contador > 0) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  handler?.(false, '');
}
