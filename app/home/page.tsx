import { permanentRedirect } from 'next/navigation'

/** The homepage used to live at /home; keep old links working. */
export default function LegacyHome() {
  permanentRedirect('/')
}
