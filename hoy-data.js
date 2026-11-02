// EDITA SOLO ESTE ARCHIVO para actualizar "Hoy en Bolívar" y la cartelera (no hay que tocar index.html)
window.HOY={
 aviso:"📢 Aviso: escribe aquí el comunicado destacado (déjalo vacío para ocultarlo).",
 fechas:[ // f = AAAA-MM-DD  (ejemplos: cámbialos por las fechas reales)
  {t:"Cierre del Período 4",f:"2026-11-27"},
  {t:"Entrega de informes",f:"2026-12-04"}],
 fbPagina:"https://www.facebook.com/profile.php?id=61566338526972", // página de Facebook cuyas últimas publicaciones se muestran solas en la portada
 fbModo:"pagina", // "pagina" = ventana automática (recomendado). "manual" = usa solo la lista fbPosts de abajo
 fbCards:[ // tarjetas destacadas bajo la ventana de Facebook (t = título, u = enlace, i = imagen opcional: ruta o URL)
  {t:"Reel ColBolívar · 1",u:"https://www.facebook.com/share/r/1BoWv6F7C7/"},
  {t:"Reel ColBolívar · 2",u:"https://www.facebook.com/share/r/18m3tUwCx9/"},
  {t:"Reel ColBolívar · 3",u:"https://www.facebook.com/share/r/19tiJo4D9K/"}],
 fbPosts:[ // videos/reels/publicaciones PÚBLICAS de Facebook (solo con fbModo:"manual"; deben ser enlaces largos .../reel/123... o .../posts/123..., los cortos facebook.com/share/... NO se pueden incrustar)
  "https://www.facebook.com/share/r/1BoWv6F7C7/",
  "https://www.facebook.com/share/r/18m3tUwCx9/",
  "https://www.facebook.com/share/r/19tiJo4D9K/"]
};
