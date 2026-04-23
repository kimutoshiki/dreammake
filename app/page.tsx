import { redirect } from 'next/navigation';

/**
 * ルート URL は、「児童用」と「先生用」どちらに入るかの選択画面を持たない。
 * 児童用が主役のプラットフォームなので、こどもの ページへ自動で飛ばす。
 * 先生は /teacher を直接開く(ブックマーク / QR コードで配布する想定)。
 */
export default function RootPage() {
  redirect('/kids');
}
