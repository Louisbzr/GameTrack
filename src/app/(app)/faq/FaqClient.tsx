'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQS = [
  {
    category: 'Général',
    items: [
      { q: "C'est quoi GameTrack ?", a: "GameTrack est une application pour suivre vos jeux vidéo, écrire des avis, découvrir de nouvelles sorties et partager votre passion avec d'autres joueurs. Pensez-y comme un Letterboxd, mais pour les jeux." },
      { q: "GameTrack est-il gratuit ?", a: "Oui, GameTrack est entièrement gratuit. Toutes les fonctionnalités sont accessibles sans abonnement." },
      { q: "Sur quelles plateformes est-il disponible ?", a: "GameTrack est une application web accessible depuis n'importe quel navigateur, sur ordinateur et mobile." },
    ]
  },
  {
    category: 'Bibliothèque',
    items: [
      { q: "Comment ajouter un jeu à ma bibliothèque ?", a: "Cliquez sur le bouton + dans la barre de navigation ou directement sur la page d'un jeu. Vous pouvez définir un statut (En cours, Terminé, À jouer, Abandonné) et une note." },
      { q: "Comment importer mes jeux Steam ?", a: "Allez dans Profil → Plateformes, connectez votre compte Steam en entrant votre Steam ID, puis cliquez sur Synchroniser. Votre bibliothèque Steam sera importée automatiquement." },
      { q: "Puis-je importer depuis d'autres plateformes ?", a: "Pour l'instant, seul Steam est supporté. L'import Xbox est en cours de développement. PlayStation et Nintendo n'offrent pas d'API publique." },
    ]
  },
  {
    category: 'Profil & Compte',
    items: [
      { q: "Comment rendre mon profil privé ?", a: "Allez dans Paramètres → Confidentialité et désactivez 'Profil public'. Seuls vos amis pourront voir votre profil." },
      { q: "Comment gagner de l'XP et monter de niveau ?", a: "Vous gagnez de l'XP en ajoutant des jeux, écrivant des avis, débloquant des badges, et en jouant régulièrement. Chaque action sur l'app vous récompense." },
      { q: "Comment supprimer mon compte ?", a: "Allez dans Paramètres → Données & compte → Supprimer mon compte. Cette action est irréversible et supprime toutes vos données." },
    ]
  },
  {
    category: 'Signalement & Modération',
    items: [
      { q: "Comment signaler un contenu inapproprié ?", a: "Sur chaque avis ou profil, un bouton 🚩 vous permet de signaler. Nos modérateurs examineront le signalement dans les plus brefs délais." },
      { q: "Que se passe-t-il après un signalement ?", a: "L'équipe de modération examine le contenu. Si la violation est confirmée, le contenu est supprimé et l'utilisateur averti ou banni selon la gravité." },
    ]
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4">
        <span className="font-medium text-sm text-foreground">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed -mt-1">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FaqClient() {
  const [activeCategory, setActiveCategory] = useState('Général')

  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Questions fréquentes</h1>
          <p className="text-muted-foreground">Tout ce que vous devez savoir sur GameTrack.</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {FAQS.map(cat => (
            <button key={cat.category} onClick={() => setActiveCategory(cat.category)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeCategory === cat.category
                  ? 'bg-primary text-primary-foreground'
                  : 'glass text-muted-foreground hover:text-foreground'
              }`}>
              {cat.category}
            </button>
          ))}
        </div>

        {FAQS.filter(c => c.category === activeCategory).map(cat => (
          <div key={cat.category} className="glass rounded-xl px-6">
            {cat.items.map(item => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        {/* CTA */}
        <div className="mt-10 glass rounded-xl p-6 text-center">
          <p className="text-foreground font-semibold mb-1">Vous n'avez pas trouvé votre réponse ?</p>
          <p className="text-sm text-muted-foreground mb-4">Notre équipe est disponible pour vous aider.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/contact"
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Nous contacter
            </a>
            <a href="/suggestions"
              className="px-5 py-2.5 rounded-xl glass text-sm font-semibold text-foreground hover:bg-secondary/60 transition-colors">
              Faire une suggestion
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}