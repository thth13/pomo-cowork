export type PracticeVariant = 'flow' | 'blurt' | 'recall' | 'spaced' | 'explain' | 'micro' | 'offline' | 'journal' | 'tidy' | 'read'

export interface PracticeTimerConfig {
  name: string
  caption: string
  stages: { label: string; minutes: number; prompt: string }[]
  presets: number[]
  finish: string
}

export const practiceTimerConfig: Record<PracticeVariant, PracticeTimerConfig> = {
  flow: {
    name: 'Follow the work', caption: 'An open-ended focus session, then a break at one fifth of your focus time.',
    stages: [{ label: 'Focus', minutes: 0, prompt: 'Work until you reach a sensible stopping point.' }, { label: 'Rest', minutes: 5, prompt: 'Leave a breadcrumb for your return, then step away.' }],
    presets: [3, 5, 10], finish: 'Break finished. Decide whether another session would be useful.',
  },
  blurt: {
    name: 'The blank-page round', caption: 'A topic, a blank sheet, and whatever you can remember.',
    stages: [{ label: 'Recall', minutes: 5, prompt: 'Hide your notes. Get the ideas onto paper in any order.' }, { label: 'Check', minutes: 3, prompt: 'Open your source. Mark missing or mistaken ideas in another colour.' }, { label: 'Retry', minutes: 2, prompt: 'Close the source again. Explain just the gaps.' }],
    presets: [2, 5, 8], finish: 'Keep the gaps you found. They are the starting point for your next review.',
  },
  recall: {
    name: 'Question first. Answer later.', caption: 'Separate the attempt from the answer key.',
    stages: [{ label: 'Retrieve', minutes: 10, prompt: 'Answer a small set of questions with the solutions covered.' }, { label: 'Check', minutes: 5, prompt: 'Compare your reasoning, not just the final answer.' }, { label: 'Repair', minutes: 5, prompt: 'Try one missed question again without looking.' }],
    presets: [5, 10, 20], finish: 'Review finished. Put one difficult question aside to try on another day.',
  },
  spaced: {
    name: 'A small return visit', caption: 'Time today’s review. Schedule the next one in your own calendar.',
    stages: [{ label: 'Review', minutes: 10, prompt: 'Start with older material before opening today’s notes.' }, { label: 'Check gaps', minutes: 5, prompt: 'Separate uncertain answers from the ones you can explain.' }, { label: 'Plan next visit', minutes: 2, prompt: 'Write a realistic review date in your notebook or calendar.' }],
    presets: [5, 10, 15], finish: 'This visit is complete. The next review date belongs in your own calendar.',
  },
  explain: {
    name: 'The teach-back desk', caption: 'Say it plainly. Notice where the explanation gets stuck.',
    stages: [{ label: 'Explain', minutes: 5, prompt: 'Explain one idea aloud as if your listener is new to it.' }, { label: 'Look it up', minutes: 4, prompt: 'Find the specific detail you could not explain.' }, { label: 'Try again', minutes: 3, prompt: 'Give the explanation again, with one concrete example.' }],
    presets: [3, 5, 10], finish: 'One more question: could your listener use the idea without your help?',
  },
  micro: {
    name: 'One useful thing', caption: 'A short lesson needs a small enough question.',
    stages: [{ label: 'Learn', minutes: 5, prompt: 'Read one worked example or watch one short explanation.' }, { label: 'Try', minutes: 3, prompt: 'Use it once without following the example line by line.' }, { label: 'Keep', minutes: 2, prompt: 'Write the one idea you want to use again.' }],
    presets: [3, 5, 8], finish: 'Keep the example you made. You can build on it next time.',
  },
  offline: {
    name: 'Let the phone wait', caption: 'Put this timer on a computer. Leave your phone out of reach.',
    stages: [{ label: 'Away from the feed', minutes: 20, prompt: 'Pick up the book, sketch, or small job you chose before starting.' }, { label: 'Return gently', minutes: 2, prompt: 'Decide what you need from your phone before picking it up.' }],
    presets: [10, 20, 30], finish: 'The pause is yours to end. There is no score to protect.',
  },
  journal: {
    name: 'A few lines for yourself', caption: 'Use your own notebook. Nothing needs to sound impressive.',
    stages: [{ label: 'Write', minutes: 10, prompt: 'Start with: “The thing still on my mind is…”' }, { label: 'Close the page', minutes: 2, prompt: 'Underline a sentence to return to, or simply close the notebook.' }],
    presets: [5, 10, 15], finish: 'Enough for today. You do not need to turn the page into a plan.',
  },
  tidy: {
    name: 'One surface, then stop', caption: 'Choose the drawer, desk, or shelf before starting.',
    stages: [{ label: 'Sort', minutes: 10, prompt: 'Stay inside one small area. Leave other cupboards closed.' }, { label: 'Put away', minutes: 5, prompt: 'Return the keepers and take the outgoing items to their next place.' }],
    presets: [5, 10, 15], finish: 'Finish putting things away before opening another area.',
  },
  read: {
    name: 'The quiet reading hour', caption: 'Everyone brings a book. One person watches the time.',
    stages: [{ label: 'Settle in', minutes: 5, prompt: 'Find a seat, silence devices, and agree on the finishing time.' }, { label: 'Read', minutes: 45, prompt: 'Read your own book at your own pace. No page target.' }, { label: 'Share, if you like', minutes: 10, prompt: 'Talk about a passage, trade a recommendation, or keep reading.' }],
    presets: [15, 30, 45], finish: 'Reading time is over. Sharing is optional; finishing the book is not required.',
  },
}
