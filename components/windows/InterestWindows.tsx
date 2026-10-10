'use client'

import { interests } from '@/lib/about'
import { InterestCloudPopup } from '@/components/InterestCloudPopup'

export function InterestWindows() {
  return interests.map(interest => <InterestCloudPopup key={interest.id} interest={interest} />)
}
