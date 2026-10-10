'use client'

import { type Interest, interestWindowId } from '@/lib/about'
import { Window } from './Window'

export function InterestCloudPopup({ interest }: { interest: Interest }) {
  return (
    <Window
      id={interestWindowId(interest.id)}
      title={interest.title}
      presentation="cloud"
      size="compact"
      returnFocusId={`interest-trigger-${interest.id}`}
    >
      <p>{interest.description}</p>
    </Window>
  )
}
