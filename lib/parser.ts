export interface ParsedTicket {
  isMulti: boolean
  questions: string[]
}

function hasNumberedQuestions(text: string): boolean {
  return /^\s*\d+[\.\)]\s+.+/m.test(text)
}

function hasBulletedQuestions(text: string): boolean {
  return /^\s*[-*]\s+.+/m.test(text)
}

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) || []).length
}

function splitNumbered(text: string): string[] {
  const lines = text.split('\n')
  const questions: string[] = []
  let current = ''

  for (const line of lines) {
    if (/^\s*\d+[\.\)]\s+/.test(line)) {
      if (current.trim()) questions.push(current.trim())
      current = line.replace(/^\s*\d+[\.\)]\s+/, '').trim()
    } else if (current) {
      current += ' ' + line.trim()
    }
  }
  if (current.trim()) questions.push(current.trim())
  return questions.filter(q => q.length > 0)
}

function splitBulleted(text: string): string[] {
  const lines = text.split('\n')
  const questions: string[] = []
  let current = ''

  for (const line of lines) {
    if (/^\s*[-*]\s+/.test(line)) {
      if (current.trim()) questions.push(current.trim())
      current = line.replace(/^\s*[-*]\s+/, '').trim()
    } else if (current) {
      current += ' ' + line.trim()
    }
  }
  if (current.trim()) questions.push(current.trim())
  return questions.filter(q => q.length > 0)
}

function splitByQuestionMarks(text: string): string[] {
  const sentences = text.split(/(?<=\?)\s+/)
  return sentences.map(s => s.trim()).filter(s => s.length > 10)
}

export function parseTicket(rawQuestion: string): ParsedTicket {
  const text = rawQuestion.trim()

  if (hasNumberedQuestions(text)) {
    const questions = splitNumbered(text)
    if (questions.length > 1) {
      return { isMulti: true, questions }
    }
  }

  if (hasBulletedQuestions(text)) {
    const questions = splitBulleted(text)
    if (questions.length > 1) {
      return { isMulti: true, questions }
    }
  }

  if (countQuestionMarks(text) >= 2) {
    const questions = splitByQuestionMarks(text)
    if (questions.length > 1) {
      return { isMulti: true, questions }
    }
  }

  return { isMulti: false, questions: [text] }
}

export function assembleMultiAnswer(answers: string[]): string {
  if (answers.length === 1) return answers[0]
  return answers.map((a, i) => `${i + 1}. ${a}`).join('\n\n')
}
