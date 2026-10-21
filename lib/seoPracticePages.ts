import type { PracticeVariant } from './practiceTimerConfig'
import type { SeoSlug } from './seoRoutes'

export interface PracticeSeoPage {
  practice: PracticeVariant
  keyword: string
  secondaryKeywords: string[]
  title: string
  description: string
  heading: string
  intro: string
  eyebrow: string
  takeaway: string
  guide: { heading: string; paragraphs: string[] }[]
  stepsHeading: string
  steps: string[]
  example: { heading: string; text: string }
  faq: { question: string; answer: string }[]
  resources: { label: string; url: string }[]
  related: SeoSlug[]
}

// Editorial targets, not claims of measured search volume. Research: docs/seo-practice-pages.md.
export const practiceSeoPages = {
  'flowmodoro-timer': {
    practice: 'flow', keyword: 'flowmodoro timer', secondaryKeywords: ['flowtime timer', 'flowmodoro break calculator', 'count up focus timer'],
    title: 'Flowmodoro Timer — Count Up, Then Take a Break | Pomo Cowork',
    description: 'Work without a fixed countdown. This free Flowmodoro timer counts up, then prepares a break worth one fifth of your focus time. No sessions saved.',
    heading: 'A Flowmodoro timer that leaves the stopping point to you.',
    eyebrow: 'Work at your own pace',
    intro: 'Sometimes the paragraph finally starts making sense at minute 24. Keep going. When you reach a good stopping point, turn the time you worked into a short break.',
    takeaway: '40 minutes of focus → 8 minutes of rest',
    guide: [
      { heading: 'How this Flowmodoro timer works', paragraphs: ['Press Start and the clock counts up from zero. When you are ready to stop, choose Prepare break. The timer divides your displayed focus time by five, rounds the result up to a whole second, and sets a break of at least one minute. The break waits for you to start it.', 'A 40-minute session gives you eight minutes off. A 25-minute session gives you five. The ratio is a convenient convention, not a rule about how long your body needs to rest. You can adjust the prepared break before starting.'] },
      { heading: 'Choose it when the work has its own rhythm', paragraphs: ['A fixed interval is useful when getting started is the problem. An open-ended timer can be a better fit when interruptions are the problem: tracing a bug, following a difficult argument, or joining up the parts of a draft. Pause for a doorbell or a call; resume when the work actually resumes.', 'Give yourself a stopping cue before you begin. “When I finish checking this function” is more useful than “when I feel completely done.” An open clock can otherwise turn into a reason to postpone every break.'] },
      { heading: 'Flowtime and Flowmodoro are related, but not identical', paragraphs: ['People use both names for flexible focus sessions. Flowtime routines can involve observing attention and choosing breaks freely; Flowmodoro tools often calculate a break from elapsed work. This page implements the latter, with a fixed 5:1 starting ratio and an editable break. It does not rate your focus or keep a work log.'] },
    ],
    stepsHeading: 'Give the session a useful ending',
    steps: ['Choose a task and a natural stopping cue.', 'Start the count-up clock. Pause for interruptions.', 'Select Prepare break when you reach that cue.', 'Start the suggested rest, then reset for a fresh session.'],
    example: { heading: 'Leave a breadcrumb', text: 'Before the break, write “Next: check the empty-state response.” That small note saves you from rereading the whole file when you return.' },
    faq: [
      { question: 'Does Flowmodoro stop after 25 minutes?', answer: 'No. Focus counts upward until you pause or prepare a break. There is no automatic focus deadline or automatic break start.' },
      { question: 'Can I change the break?', answer: 'Yes. Prepare break calculates one fifth of the displayed focus time, with a one-minute minimum. Before starting it, use a preset or enter a whole number of minutes from 1 to 180.' },
      { question: 'Will this update my main Pomodoro?', answer: 'No. These clocks belong to this page only. Starting, pausing, resetting, and finishing do not create a session or change the workspace timer. Reloading clears the local clock.' },
    ],
    resources: [{ label: 'Flowmodoro: an example of the flexible-timer approach', url: 'https://flowmodoro.com/' }],
    related: ['study-stopwatch', 'deep-work-timer', 'timeboxing-timer', 'microlearning-timer'],
  },
  'blurting-timer': {
    practice: 'blurt', keyword: 'blurting timer', secondaryKeywords: ['blurting method timer', 'blurting revision', 'blank page recall timer'],
    title: 'Blurting Timer — Recall, Check, Try Again | Pomo Cowork',
    description: 'Try a short blurting revision round: five minutes of recall, three to check your notes, and two to retry the gaps. Free, adjustable, and local.',
    heading: 'Blurting timer. Start with a blank page.', eyebrow: 'Messy notes welcome',
    intro: 'Close the textbook. Write what you remember, even if it comes out in fragments. The interesting part is what you notice when you open the book again.',
    takeaway: '5 min recall / 3 min check / 2 min retry',
    guide: [
      { heading: 'Make the topic smaller than the page', paragraphs: ['“Biology” is too much for one round. “How water moves through a plant” gives you somewhere to begin. Put that heading on paper, hide your source, and use the first interval to write or sketch from memory. Arrows, unfinished sentences, and rough diagrams are all useful here.', 'You are making something to check, not a set of notes to hand in. If the page stays nearly empty, spend a little time learning the material before trying again. A blank sheet cannot tell you much about a topic you have never studied.'] },
      { heading: 'The checking round matters', paragraphs: ['Keep the original attempt visible while you compare it with a reliable source. Use a different pen to distinguish something missing from something incorrect. Those are different jobs for the next session: one needs another detail; the other needs a corrected explanation.', 'The final two-minute round is deliberately narrow. Cover the source and retry one gap instead of rewriting the whole sheet. Later, come back to the topic with a fresh page so the old layout does not do the remembering for you.'] },
      { heading: 'A short structure you can change', paragraphs: ['The 5/3/2 pattern is a starting plan for this tool, not an official blurting formula. A diagram-heavy topic may need longer. Each stage waits for your click, and its duration can be changed before it begins. Keep the actual revision on paper or in your own notes app; this page does not collect your answers.'] },
    ],
    stepsHeading: 'One sheet, three passes',
    steps: ['Write a specific topic at the top of a blank sheet.', 'Start Recall and keep your source closed.', 'Move to Check and mark gaps in another colour.', 'Move to Retry and explain one missed idea from memory.'],
    example: { heading: 'A useful gap is specific', text: '“I forgot biology” gives you nowhere to go. “I mixed up diffusion and active transport” gives your next review a clear job.' },
    faq: [
      { question: 'How long should a blurting session last?', answer: 'Start with a small topic and a short attempt. This page offers five minutes of recall, three of checking, and two of retrying. Adjust each stage if you need more space for diagrams or calculations.' },
      { question: 'Is blurting the same as copying notes?', answer: 'No. During Recall, the source is covered. You check it afterwards. Copying may help you organise material, but it does not show what you could retrieve on your own.' },
      { question: 'Should I keep repeating until the page is perfect?', answer: 'You can stop after finding a few useful gaps. Correct them, take a break, and revisit the topic on another day. The timer does not require a score or a perfect round.' },
    ],
    resources: [{ label: 'Birmingham City University: the blurting revision method', url: 'https://www.bcu.ac.uk/exams-and-revision/best-ways-to-revise/the-blurting-method' }],
    related: ['active-recall-timer', 'spaced-repetition-timer', 'gcse-study-timer', 'feynman-technique-timer'],
  },
  'active-recall-timer': {
    practice: 'recall', keyword: 'active recall timer', secondaryKeywords: ['retrieval practice timer', 'active recall study timer', 'self testing timer'],
    title: 'Active Recall Timer — Time the Attempt and the Review | Pomo Cowork',
    description: 'Give retrieval practice a clear structure: answer without notes, check your reasoning, and retry a missed question. Adjustable local study timer.',
    heading: 'An active recall timer for the attempt before the answer.', eyebrow: 'Try → check → repair',
    intro: 'You recognise the answer as soon as you see it. Could you have produced it with the page covered? Give yourself a few minutes to find out.',
    takeaway: 'An honest attempt is more useful than a familiar answer.',
    guide: [
      { heading: 'Separate knowing from recognising', paragraphs: ['Pick a few questions before starting the clock. They might be definitions, short calculations, a diagram to label, or a process to explain. Keep the solutions out of sight for the Retrieve stage. If you get stuck, write down the point where you lost the thread instead of quietly looking it up.', 'There is no benefit in making the questions impossibly broad. Replace “Explain economics” with a prompt such as “What changes when demand rises and supply stays fixed?” You need an answer you can actually inspect.'] },
      { heading: 'Use the review to choose the next attempt', paragraphs: ['During Check, look at the working as well as the result. A correct answer reached by a guess needs different attention from a sound method with a small arithmetic error. Mark what happened in your own notes.', 'Repair is a fresh attempt at a small part of the work. Close the solution again and redo the troublesome step. If you still cannot explain it, go back to an example or ask for help. Repeatedly timing the same confusion will not resolve it by itself.'] },
      { heading: 'This is a practice block, not an exam', paragraphs: ['The default plan is ten minutes of retrieval, five of checking, and five of repair. Change those lengths to fit the questions. A timer provides a boundary for the activity; your answers provide the evidence of understanding. Save timed exam practice for sessions where pace is part of the skill you want to practise.'] },
    ],
    stepsHeading: 'Prepare the questions first',
    steps: ['Choose a small question set and hide the answers.', 'Use Retrieve to make a real attempt on paper.', 'Use Check to compare the reasoning with a trusted source.', 'Use Repair to retry one mistake without the solution.'],
    example: { heading: 'Make one question harder to bluff', text: 'Instead of “Do I understand photosynthesis?”, ask “Where does the carbon in a growing plant come from?” Write a complete answer before checking it.' },
    faq: [
      { question: 'Does this timer generate flashcards or grade answers?', answer: 'No. Bring your own questions, cards, or textbook. The timer only separates the practice stages; it does not read answers, generate content, or calculate a learning score.' },
      { question: 'How is this different from the blurting timer?', answer: 'This page is built around specific questions and a check of each answer. Blurting begins with a topic and a blank sheet, so you recall the structure and details without a question list.' },
      { question: 'Can I use it with spaced repetition?', answer: 'Yes. Use this timer when you sit down to review, and use your own calendar or flashcard app to decide when the next review happens. Nothing is scheduled by this page.' },
    ],
    resources: [{ label: 'University of Minnesota: spaced and interleaved retrieval practice', url: 'https://cei.umn.edu/teaching-resources/leveraging-learning-sciences/spaced-and-interleaved-practice-improves-recall' }],
    related: ['blurting-timer', 'spaced-repetition-timer', 'study-timer-for-exams', 'microlearning-timer'],
  },
  'spaced-repetition-timer': {
    practice: 'spaced', keyword: 'spaced repetition timer', secondaryKeywords: ['spaced practice timer', 'flashcard review timer', 'spaced revision session'],
    title: 'Spaced Repetition Timer for a Short Review Session | Pomo Cowork',
    description: 'Time a review of older material, check the gaps, and plan your next visit. A free local timer to use beside your flashcards or review calendar.',
    heading: 'Spaced repetition timer. Come back and see what stayed.', eyebrow: 'Today’s review',
    intro: 'Yesterday’s topic feels familiar. A week later, the missing pieces are easier to spot. Use this timer for the review you planned, then choose when to return.',
    takeaway: 'Today’s timer is a session boundary. Your calendar holds the spacing.',
    guide: [
      { heading: 'Two different kinds of interval', paragraphs: ['Spaced repetition involves gaps between encounters with material. A review timer measures the minutes inside one encounter. This page handles that second job. It does not run for days, send reminders, or choose when a card is due.', 'Open the material that your own plan or flashcard app says to review. Try the questions before reading the answers. An old topic may take only a few minutes; a stubborn one may need a worked example and another attempt.'] },
      { heading: 'Let the difficulty inform the next visit', paragraphs: ['When an answer comes back easily and you can explain it, you may choose a longer gap next time. When it does not, write down what needs repairing and plan an earlier return. There is no universal day-one, day-three, day-seven schedule that fits every learner and every topic.', 'If you already use a flashcard scheduler, keep using its due dates. The local countdown is simply a way to protect a manageable review window. Finishing the clock does not mean you must clear the entire deck.'] },
      { heading: 'Leave a better note than “review chapter four”', paragraphs: ['The last two-minute stage is for a practical handoff to your future self. Note the exact question, the source you checked, and the next date in a place you will actually see. A short note such as “Friday: draw the stages without labels” is much easier to act on than a broad reminder to revise.'] },
    ],
    stepsHeading: 'Make today’s visit count',
    steps: ['Bring a topic or a set of cards that is due for review.', 'Use Review to retrieve it before looking.', 'Use Check gaps to repair uncertain answers.', 'Put the next review date in your own calendar during Plan next visit.'],
    example: { heading: 'A small review can be enough', text: 'Five vocabulary cards, one diagram, and a troublesome definition may fill today’s block. You do not need to reopen the whole course to revisit those pieces.' },
    faq: [
      { question: 'Does the timer schedule spaced repetition?', answer: 'No. It times a single review session. Use a calendar, notebook, or flashcard scheduler for dates and reminders. Reloading this page clears its timer.' },
      { question: 'Can I use it alongside Anki?', answer: 'Yes. Open your existing deck separately and use this page to bound the review session. There is no Anki integration, card import, account connection, or change to your deck.' },
      { question: 'What if I miss a planned review?', answer: 'Choose a manageable set when you return, check what you can still explain, and update your plan from there. This tool has no overdue counter or streak to repair.' },
    ],
    resources: [{ label: 'University of Minnesota: spacing and interleaving practice', url: 'https://cei.umn.edu/teaching-resources/leveraging-learning-sciences/spaced-and-interleaved-practice-improves-recall' }],
    related: ['active-recall-timer', 'blurting-timer', 'microlearning-timer', 'study-timer'],
  },
  'feynman-technique-timer': {
    practice: 'explain', keyword: 'Feynman technique timer', secondaryKeywords: ['teach back timer', 'explain it simply study method', 'Feynman study timer'],
    title: 'Feynman Technique Timer — Explain, Check, Simplify | Pomo Cowork',
    description: 'Explain one concept aloud, look up the part that trips you up, and try again. A free Feynman technique timer with three adjustable practice stages.',
    heading: 'Feynman technique timer. One idea, in your own words.', eyebrow: 'Explain → check → simplify',
    intro: 'Pick one idea. Explain it to an imaginary listener who has never taken the class. The sentence you cannot finish tells you where to look next.',
    takeaway: 'A plain explanation still needs to be accurate.',
    guide: [
      { heading: 'Choose an idea you can explain in one sitting', paragraphs: ['“Electricity” is a whole subject. “Why this bulb goes out when the circuit opens” is a question you can work with. Use the first five minutes to explain the smaller idea aloud or on paper. Start with what happens, then explain why.', 'You do not need a real audience, a recording, or a polished speech. The point is to notice where you start replacing an explanation with a label. Saying “because of the mechanism” is often the place to stop and ask what the mechanism actually does.'] },
      { heading: 'Look up the missing link', paragraphs: ['During the second stage, go back to a trusted source with a specific question. Find the missing relationship, definition, or step. Resist the temptation to copy an entire paragraph just because it sounds better than your version.', 'Then close the source and explain the idea again. Add a concrete example. If you use an analogy, say where it stops being accurate: a water-pipe comparison may help with one part of a circuit and confuse another. Simple language should reveal the idea, not erase its conditions.'] },
      { heading: 'Use it before writing the final answer', paragraphs: ['A spoken explanation can expose a gap before you spend an hour turning it into an essay. It also makes a useful preparation round for tutorials, presentations, and interviews. Afterwards, restore any formal terms your course expects and check that you can use them precisely. The timer offers a 5/4/3 practice plan; those lengths are editable, not part of a required method.'] },
    ],
    stepsHeading: 'Teach it, then teach it again',
    steps: ['Choose one concept and a beginner-level question.', 'Explain it without reading your source aloud.', 'Look up the exact point where the explanation broke down.', 'Try again with a concrete example and the necessary caveats.'],
    example: { heading: 'Ask a listener’s question', text: '“What does that word mean?” and “Why does that happen?” are useful interruptions. If either one unravels the explanation, you have found a worthwhile place to study.' },
    faq: [
      { question: 'Does this record my voice?', answer: 'No. There is no microphone access, recording, transcription, or AI assessment. Explain the concept aloud to yourself, to someone nearby, or in your own notebook.' },
      { question: 'Do I have to avoid every technical word?', answer: 'No. Define a term when it is useful, then show what it means in the explanation. The aim is understanding, not replacing accurate vocabulary with vague language.' },
      { question: 'Can I use the timer for maths?', answer: 'Yes. Explain why each step in a worked problem is valid, then try a similar problem independently. A fluent description alone is not a substitute for being able to do the calculation.' },
    ],
    resources: [{ label: 'Kansas State University: the Feynman technique', url: 'https://www.k-state.edu/aac/success-tools/collection/feynman_technique.html' }],
    related: ['active-recall-timer', 'blurting-timer', 'microlearning-timer', 'study-timer'],
  },
  'microlearning-timer': {
    practice: 'micro', keyword: 'microlearning timer', secondaryKeywords: ['bite sized learning timer', '10 minute learning session', 'short study session timer'],
    title: 'Microlearning Timer — Learn One Thing in a Short Block | Pomo Cowork',
    description: 'Make a short learning session useful: five minutes to learn, three to try, and two to keep a note. Free adjustable timer with no saved activity.',
    heading: 'Microlearning timer. Ten minutes for one useful thing.', eyebrow: 'A small lesson, with practice',
    intro: 'There is a gap before your next meeting. Choose one shortcut, one phrase, or one worked example. Leave with something you tried, not just something you watched.',
    takeaway: 'Learn for 5. Try for 3. Keep a note for 2.',
    guide: [
      { heading: 'Small is about the objective', paragraphs: ['A short video about an enormous topic is still an enormous topic. For this session, choose an outcome you can demonstrate: write one spreadsheet formula, pronounce one sentence, or use one editing shortcut. Have the example and the place to practise ready before pressing Start.', 'The default ten-minute plan divides your attention between explanation, application, and a brief note. You can change any stage. If the task needs uninterrupted depth, use a longer study block instead of trying to squeeze it into this format.'] },
      { heading: 'Do something during the middle three minutes', paragraphs: ['Close the example and make a small version of your own. Change the numbers in the formula. Say a different sentence using the same structure. Apply the shortcut to a real document. The attempt is where you find out whether the explanation gave you enough to work with.', 'If it fails, keep the failure specific. “I used the wrong cell reference” is a useful note for next time. “I am bad at spreadsheets” is not a description of what happened in those three minutes.'] },
      { heading: 'Connect the small sessions', paragraphs: ['A collection of unrelated tips can feel busy without adding up to a skill. Keep several short sessions pointed at the same project. Today you learn to filter a table; next time you sort it; later you answer a real question with both. Write your next step somewhere you already keep work notes. This page does not build a curriculum or remember previous lessons.'] },
    ],
    stepsHeading: 'Before the next meeting',
    steps: ['Choose one action you want to be able to perform.', 'Learn from one short explanation or worked example.', 'Try it with a small change of your own.', 'Keep the example and one next step in your notes.'],
    example: { heading: 'A session with a visible result', text: 'Learn how an absolute cell reference works, write a formula that uses it, then copy it down three rows. You finish with something you can check.' },
    faq: [
      { question: 'Does microlearning always mean ten minutes?', answer: 'No. Ten minutes is this page’s starting plan. The important constraint is a focused objective with enough room to practise it. You can adjust each stage from 1 to 180 minutes.' },
      { question: 'Can this replace a full course?', answer: 'The timer cannot supply the sequence, feedback, and depth of a course. Use short sessions for a narrow skill, a review, or one part of a larger learning plan.' },
      { question: 'Does it provide lessons?', answer: 'No. Bring your own material. The page provides a local timer and a learn–try–keep structure; it does not generate lessons or track progress.' },
    ],
    resources: [{ label: 'ERIC: a 2026 review of microlearning research', url: 'https://eric.ed.gov/?id=EJ1512096' }],
    related: ['active-recall-timer', 'spaced-repetition-timer', 'feynman-technique-timer', 'flowmodoro-timer'],
  },
  'digital-detox-timer': {
    practice: 'offline', keyword: 'digital detox timer', secondaryKeywords: ['phone free timer', 'screen break timer', 'offline hobby timer'],
    title: 'Digital Detox Timer — Make Room for a Phone-Free Break | Pomo Cowork',
    description: 'Set a simple phone-free interval for reading, sketching, or an everyday task. A quiet local timer without streaks, app blocking, or session tracking.',
    heading: 'A digital detox timer. Let the phone wait a little.', eyebrow: 'A little time away from the feed',
    intro: 'Leave the timer on your computer and put the phone somewhere inconvenient. Have something else within reach: a paperback, a pencil, the mug you meant to wash.',
    takeaway: 'Choose what you are doing before choosing what you are avoiding.',
    guide: [
      { heading: 'Make the alternative easy to reach', paragraphs: ['Putting the phone down is one decision. Knowing what to do with the next few minutes is another. Before starting, open the book at the bookmark or put the sketchbook on the table. An unfinished, ordinary activity is enough; this does not need to become a new lifestyle.', 'Choose ten, twenty, or thirty minutes, or set your own interval. The countdown is silent and stays on this page. If you want a completely screen-free break, a physical timer is a better fit. This tool is for leaving the phone alone while a computer keeps the time.'] },
      { heading: 'Keep the boundary realistic', paragraphs: ['You may need to remain reachable for someone. Use the notification settings on your own device to allow those contacts, and choose an interval that fits your day. This page does not block apps, monitor other tabs, or prevent you from picking up the phone.', 'If you do check it, there is no failed streak. Put it back down and continue, or end the session. A useful boundary should make the next few minutes easier to choose, not give you another score to defend.'] },
      { heading: 'Decide how to return', paragraphs: ['The optional two-minute return stage is a pause before opening a feed again. Ask what you actually need: reply to one message, check the route, or make a call. You can also leave the phone where it is. “Digital detox” is a common search term; this timer makes no claim to treat a condition or reset your brain. It simply marks a break you chose.'] },
    ],
    stepsHeading: 'Prepare a phone-free pocket of time',
    steps: ['Choose a book, hobby, or small household task.', 'Put the phone out of easy reach and set the interval.', 'Start the clock on your computer and turn to the activity.', 'At the end, decide whether you need the phone yet.'],
    example: { heading: 'No shopping required', text: 'Read the magazine already on the table. Repair a loose button. Water a plant. The alternative does not have to be impressive or worth posting.' },
    faq: [
      { question: 'Does this block distracting websites?', answer: 'No. It is a countdown, not a blocker. It cannot inspect your browsing, lock your phone, or enforce the interval. You control the boundary.' },
      { question: 'Is there a sound when time is up?', answer: 'No. Completion is visual, with an accessible status announcement. Keep the page visible if you need to notice the end; it cannot promise a notification while your computer sleeps.' },
      { question: 'Does it save a streak or screen-time report?', answer: 'No. The timer does not record sessions or measure device use. Reloading or leaving the page clears the local countdown.' },
    ],
    resources: [{ label: 'Michaels: 2026 report on the return to analog hobbies', url: 'https://www.michaelspressroom.com/news/detail/5025/michaels-unveils-2026-creativity-trend-report-revealing' }],
    related: ['journaling-timer', 'silent-reading-timer', 'declutter-timer', 'reading-timer'],
  },
  'journaling-timer': {
    practice: 'journal', keyword: 'journaling timer', secondaryKeywords: ['journal writing timer', '10 minute journaling', 'freewriting journal timer'],
    title: 'Journaling Timer — Ten Minutes with Your Own Notebook | Pomo Cowork',
    description: 'Set aside five, ten, or fifteen minutes for a few honest lines in your notebook. A quiet journaling timer with a gentle prompt and no saved writing.',
    heading: 'A journaling timer for the words you have today.', eyebrow: 'No audience. No word count.',
    intro: 'You do not need an interesting day to fill a little of the page. Start with the thought that keeps coming back, or the small detail you nearly forgot.',
    takeaway: 'The page can stop mid-thought. You can return to it tomorrow.',
    guide: [
      { heading: 'Begin somewhere ordinary', paragraphs: ['Set a short interval and open your own notebook. Write the date if it helps. Then try a plain first line: “The thing still on my mind is…” You can describe a conversation, list what needs doing, or write about the walk home. There is no requirement to discover something profound.', 'If a prompt gets in the way, ignore it. Describe what is on the desk. Copy a phrase you want to remember and explain why it stayed with you. Sometimes a concrete detail is an easier entrance than a big question about your life.'] },
      { heading: 'Let the timer hold the boundary', paragraphs: ['Five minutes is a reasonable first commitment. Ten gives a thought room to wander. Fifteen might suit a longer freewrite. None is a quota. Pause for an interruption, or stop early when you have said enough.', 'When the writing stage ends, the optional two-minute closing stage gives you a little room to reread. Underline a sentence, note something practical, or close the notebook without interpreting it. You do not have to turn every entry into a lesson.'] },
      { heading: 'Keep the writing where you want it', paragraphs: ['There is deliberately no journal editor on this page. Use paper or an app you already trust. The timer cannot read or save your entry, and it does not count words, judge the tone, or ask you to publish. This is a small writing ritual, separate from the public journal and project features in the main workspace.'] },
    ],
    stepsHeading: 'Open the notebook',
    steps: ['Put a notebook and pen within reach.', 'Choose a short interval that feels easy to begin.', 'Write without stopping to polish every sentence.', 'Use Close the page if you want a moment to reread.'],
    example: { heading: 'Three possible first lines', text: '“I keep putting off…” · “Something I noticed on the way home…” · “The conversation went differently from how I expected…” Pick one, or write something completely unrelated.' },
    faq: [
      { question: 'Do I type my journal entry here?', answer: 'No. This page only holds the clock. Write in your own notebook or separate app. No journal text is collected by the timer.' },
      { question: 'Is this a word-count challenge?', answer: 'No. There is no target, score, or minimum entry length. A list, a paragraph, or a few lines can be enough for the session.' },
      { question: 'Can I use it for morning pages?', answer: 'Yes, if a timed freewrite suits you. Traditional morning-pages routines are often page-based; this timer does not count pages or enforce a particular practice. Choose the boundary you want.' },
    ],
    resources: [{ label: 'Michaels: journaling and analog creativity in 2026', url: 'https://www.michaelspressroom.com/news/detail/5025/michaels-unveils-2026-creativity-trend-report-revealing' }],
    related: ['writing-sprint-timer', 'digital-detox-timer', 'silent-reading-timer', 'cozy-study-timer'],
  },
  'declutter-timer': {
    practice: 'tidy', keyword: 'declutter timer', secondaryKeywords: ['15 minute declutter timer', 'desk reset timer', 'quick tidy timer'],
    title: 'Declutter Timer — A Small Sort with Time to Put Things Away | Pomo Cowork',
    description: 'Try a fifteen-minute reset: ten minutes to sort one small area and five to put things away. Free local declutter timer with adjustable stages.',
    heading: 'A declutter timer for one surface at a time.', eyebrow: 'The fifteen-minute reset',
    intro: 'The desk has become a landing place for everything. Choose one corner, set the clock, and leave enough time to put things away before you stop.',
    takeaway: '10 minutes to sort + 5 minutes to close the job',
    guide: [
      { heading: 'Draw the boundary before opening a drawer', paragraphs: ['Choose a space small enough to leave usable when the timer ends: one desk surface, one shelf, or the tray by the front door. Resist emptying a whole cupboard onto the floor. The point of a short reset is to finish with less to deal with than when you began.', 'Put a bag or box nearby for items that are leaving the area. Keep decisions simple. Obvious rubbish can go; something that belongs in another room can wait in the box until the putting-away stage. Difficult decisions can stay for a session with more time.'] },
      { heading: 'Do not spend the whole interval sorting', paragraphs: ['This timer divides the default fifteen minutes into ten for sorting and five for closing the job. The second stage matters: return useful items, take rubbish out, and move the box to its proper destination. A neat set of piles is still work waiting to be finished.', 'The timer will not switch stages on its own. When Sort ends, stop opening new areas, prepare Put away, and start it. You can shorten either stage before it starts. For a small desk, five minutes of each may be plenty.'] },
      { heading: 'Make the result easy to use tomorrow', paragraphs: ['Think about the next thing you will do in that space. If you want to write, leave room for the notebook and put the pen where your hand will reach. If the surface is an entryway, give keys a predictable place. A useful reset supports the next ordinary action; it does not have to look like a photograph.'] },
    ],
    stepsHeading: 'A small job with a closing step',
    steps: ['Choose exactly one surface, shelf, or drawer.', 'Start Sort and stay within that boundary.', 'When time ends, move to Put away instead of opening another area.', 'Leave the space ready for its next use.'],
    example: { heading: 'The desk version', text: 'Collect cups, discard obvious rubbish, stack the papers that need decisions, and clear a notebook-sized space. Use the last five minutes to take the cups and rubbish where they belong.' },
    faq: [
      { question: 'Is fifteen minutes enough to declutter?', answer: 'It can be enough for a small, clearly bounded area. It is not a promise to finish a room. Choose a smaller surface if putting everything away would take longer than the session.' },
      { question: 'Can I use this as a cleaning timer?', answer: 'Yes, for a small everyday task. Adjust the stages to fit the job, and keep any product instructions or required waiting times separate from this general-purpose countdown.' },
      { question: 'What if I am not finished when Sort ends?', answer: 'Use Put away to make the area usable, even if some decisions remain. Keep those items together for later instead of opening a new area. You can always plan another short session.' },
    ],
    resources: [{ label: 'Time Timer: using time boundaries for decluttering', url: 'https://www.timetimer.com/blogs/news/declutter-your-day-with-time-timer' }],
    related: ['digital-detox-timer', 'timeboxing-timer', 'journaling-timer', 'microlearning-timer'],
  },
  'silent-reading-timer': {
    practice: 'read', keyword: 'silent reading timer', secondaryKeywords: ['silent book club timer', 'group reading timer', 'sustained silent reading timer'],
    title: 'Silent Reading Timer for Your Book Group or Quiet Hour | Pomo Cowork',
    description: 'Host a quiet reading session: settle in, read your own book, then share if you like. Free silent timer with adjustable stages and no account required.',
    heading: 'Silent reading timer. Different books, one quiet hour.', eyebrow: 'Bring whatever you are reading',
    intro: 'Find a chair, open your book, and let one person mind the clock. Nobody needs to finish a chapter or have something clever to say afterwards.',
    takeaway: '5 minutes to settle / 45 to read / 10 to share',
    guide: [
      { heading: 'Give the gathering a gentle shape', paragraphs: ['A silent reading session can be as small as two people at a kitchen table. Agree on how long you want to read and whether there will be time to talk afterwards. Everyone can bring a different book. There is no reading assignment to catch up on before arriving.', 'The starting plan has five minutes to settle in, forty-five to read, and ten for optional conversation. Treat it as a host’s outline. A lunch break might need twenty minutes of reading; a library event might allow an hour. Change the stages before starting them.'] },
      { heading: 'Let one screen do the timing', paragraphs: ['Keep the timer where the host can see it without making everyone watch the seconds. This page is silent: it does not play a bell, music, or a spoken announcement. At the end of reading, the host can give a quiet verbal cue.', 'There is no connection between readers’ devices. If you meet on a video call, one host can share this page or announce the start and finish. Opening the link on several computers creates separate clocks, not a synchronised room.'] },
      { heading: 'Make the conversation optional', paragraphs: ['Some people enjoy recommending what they read; others came for the uninterrupted time. Offer an easy question such as “Would you keep reading this?” and leave room to pass. Someone may want to read through the conversation stage, and that can be part of the arrangement.', 'This is an independent timer for a reading activity, not an official Silent Book Club product. If you want to find an established local gathering, the community’s own directory is linked below. For solo reading, you can choose the Read stage straight away.'] },
    ],
    stepsHeading: 'A simple host’s plan',
    steps: ['Agree on the reading length and how you will signal the end.', 'Use Settle in for seats, books, and silent devices.', 'Start Read and let everyone keep their own pace.', 'Offer the sharing stage, with permission to pass.'],
    example: { heading: 'For a lunch-break group', text: 'Try three minutes to settle, twenty to read, and five to chat. Leave enough time for people to get back to work without rushing the final page.' },
    faq: [
      { question: 'Does it make a sound when reading ends?', answer: 'No. The countdown ends visually. A host should watch for the finished state and signal the group. The accessible status region announces completion to assistive technology.' },
      { question: 'Can everyone join the same timer?', answer: 'This page has no shared session or device synchronisation. One host can keep the clock or share their screen. Each separate page or tab has an independent timer.' },
      { question: 'Can I use it on my own?', answer: 'Yes. Select Read before starting and choose a comfortable duration. The settling and sharing stages are optional; there is no group, account, or registration requirement.' },
    ],
    resources: [{ label: 'Silent Book Club: find a local reading community', url: 'https://silentbook.club/' }],
    related: ['reading-timer', 'digital-detox-timer', 'journaling-timer', 'study-with-friends'],
  },
} satisfies Record<string, PracticeSeoPage>

export type PracticeSlug = keyof typeof practiceSeoPages
