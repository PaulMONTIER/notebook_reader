'use client';

import { useState, useEffect } from 'react';
import { useNotebookStore } from '@/store/notebook-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Trophy,
  RotateCcw,
  Loader2
} from 'lucide-react';
import type { QuizQuestion } from '@/types';

interface QuizQuestionWithData extends QuizQuestion {
  options: string[] | null;
}

interface QuizWithData {
  id: string;
  notebookId: string;
  title: string;
  description: string | null;
  questions: QuizQuestionWithData[];
}

export function QuizView() {
  const { currentQuiz, setCurrentQuiz, currentNotebook, setViewMode } = useNotebookStore();
  const [quiz, setQuiz] = useState<QuizWithData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fetch full quiz data
  useEffect(() => {
    async function fetchQuiz() {
      if (!currentQuiz) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/quizzes/${currentQuiz.id}`);
        if (response.ok) {
          const data = await response.json();
          setQuiz(data);
        }
      } catch (error) {
        console.error('Failed to fetch quiz:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [currentQuiz]);
  
  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };
  
  const handleNext = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };
  
  const handleSubmit = () => {
    setShowResults(true);
  };
  
  const handleRetry = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
  };
  
  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Aucun quiz disponible</h2>
        <p className="text-muted-foreground mb-4">
          Générez un quiz à partir d'un notebook pour commencer.
        </p>
        <Button onClick={() => setViewMode('library')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la bibliothèque
        </Button>
      </div>
    );
  }
  
  const questions = quiz.questions;
  const currentQ = questions[currentQuestion];
  const score = calculateScore();
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  
  // Results view
  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => {
            setCurrentQuiz(null);
            setViewMode('reader');
          }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Résultats du Quiz</h1>
            <p className="text-sm text-muted-foreground">{quiz.title}</p>
          </div>
        </div>
        
        {/* Score card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className={`h-16 w-16 mx-auto mb-4 ${
                score / questions.length >= 0.7 ? 'text-yellow-500' : 
                score / questions.length >= 0.5 ? 'text-gray-400' : 'text-orange-500'
              }`} />
              <h2 className="text-3xl font-bold mb-2">
                {score} / {questions.length}
              </h2>
              <p className="text-muted-foreground mb-4">
                {score / questions.length >= 0.7 ? 'Excellent travail ! 🎉' :
                 score / questions.length >= 0.5 ? 'Bien joué ! Continuez comme ça 👍' :
                 'Continuez à étudier et réessayez 📚'}
              </p>
              <Progress value={(score / questions.length) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>
        
        {/* Question results */}
        <div className="space-y-4">
          {questions.map((q, index) => {
            const isCorrect = answers[q.id] === q.correctAnswer;
            return (
              <Card key={q.id} className={isCorrect ? 'border-green-500' : 'border-red-500'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">Question {index + 1}</p>
                      <p className="text-sm">{q.question}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!isCorrect && (
                    <div className="space-y-1 text-sm">
                      <p className="text-red-500">
                        <span className="font-medium">Votre réponse :</span> {answers[q.id] || 'Non répondu'}
                      </p>
                      <p className="text-green-500">
                        <span className="font-medium">Bonne réponse :</span> {q.correctAnswer}
                      </p>
                    </div>
                  )}
                  {q.explanation && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      💡 {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Actions */}
        <div className="flex justify-center gap-4 mt-8">
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button onClick={() => {
            setCurrentQuiz(null);
            setViewMode('reader');
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au notebook
          </Button>
        </div>
      </div>
    );
  }
  
  // Quiz view
  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => {
          setCurrentQuiz(null);
          setViewMode('reader');
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{quiz.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} sur {questions.length}
          </p>
        </div>
        <Badge variant="secondary">
          {Object.keys(answers).length} / {questions.length} répondues
        </Badge>
      </div>
      
      {/* Progress */}
      <Progress value={progress} className="h-2 mb-6" />
      
      {/* Question card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQ.id] || ''}
            onValueChange={(value) => handleAnswer(currentQ.id, value)}
          >
            <div className="space-y-3">
              {currentQ.options?.map((option, index) => (
                <div
                  key={index}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg border
                    transition-colors cursor-pointer
                    ${answers[currentQ.id] === option 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-accent'}
                  `}
                  onClick={() => handleAnswer(currentQ.id, option)}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Précédent
        </Button>
        
        {currentQuestion < questions.length - 1 ? (
          <Button onClick={handleNext}>
            Suivant
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
          >
            Voir les résultats
          </Button>
        )}
      </div>
      
      {/* Question navigation */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {questions.map((q, index) => (
          <Button
            key={q.id}
            variant={currentQuestion === index ? 'default' : 
                     answers[q.id] ? 'secondary' : 'outline'}
            size="sm"
            className="w-10 h-10 p-0"
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}
