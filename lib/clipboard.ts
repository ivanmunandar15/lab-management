/** Salin teks ke clipboard. false jika browser memblokir (mis. halaman bukan HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
