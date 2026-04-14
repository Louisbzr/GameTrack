'use client'

import { Cookie } from 'lucide-react'

export default function CookiesClient() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <Cookie className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Politique des Cookies</h1>
          <p className="text-muted-foreground text-sm">Dernière mise à jour : janvier 2025</p>
        </div>

        <div className="space-y-6">

          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-foreground mb-3">Qu'est-ce qu'un cookie ?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Un cookie est un petit fichier texte stocké sur votre appareil lors de votre visite sur un site web. Il permet de mémoriser des informations pour améliorer votre expérience.
            </p>
          </div>

          <div className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-bold text-foreground">Cookies que nous utilisons</h2>
            <div className="space-y-3">
              {[
                {
                  name: 'Cookies d\'authentification',
                  type: 'Essentiels',
                  color: 'bg-primary/10 text-primary',
                  desc: 'Fournis par Supabase pour maintenir votre session connectée. Sans ces cookies, vous devrez vous reconnecter à chaque visite. Ces cookies sont indispensables au fonctionnement du service.',
                  duration: 'Session / 7 jours'
                },
                {
                  name: 'Cookies de préférences',
                  type: 'Fonctionnels',
                  color: 'bg-blue-500/10 text-blue-400',
                  desc: 'Mémorisent vos préférences (thème clair/sombre, langue, paramètres d\'affichage) pour personnaliser votre expérience.',
                  duration: '1 an'
                },
              ].map(cookie => (
                <div key={cookie.name} className="bg-secondary/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-sm text-foreground">{cookie.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cookie.color}`}>{cookie.type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1">{cookie.desc}</p>
                  <p className="text-xs text-muted-foreground">Durée : <span className="text-foreground">{cookie.duration}</span></p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-foreground mb-3">Cookies tiers</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GameTrack n'utilise pas de cookies publicitaires ou de tracking tiers. Nous n'utilisons pas Google Analytics ni aucun outil de surveillance comportementale.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-foreground mb-3">Gérer vos cookies</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Vous pouvez contrôler et supprimer les cookies via les paramètres de votre navigateur. Notez que désactiver les cookies essentiels empêchera la connexion à GameTrack.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour supprimer votre compte et toutes les données associées, rendez-vous dans <a href="/settings" className="text-primary hover:underline">Paramètres → Données & compte</a>.
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <h2 className="font-bold text-foreground mb-3">Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour toute question sur notre utilisation des cookies, contactez-nous via la <a href="/contact" className="text-primary hover:underline">page Contact</a>.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}