'use client'

import { FileText } from 'lucide-react'

export default function CguClient() {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-muted-foreground text-sm">Dernière mise à jour : janvier 2025</p>
        </div>

        <div className="space-y-6">
          {[
            {
              title: "1. Acceptation des conditions",
              content: "En accédant et en utilisant Backlogg, vous acceptez d'être lié par ces Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application."
            },
            {
              title: "2. Description du service",
              content: "Backlogg est une application web permettant de suivre, noter et partager votre expérience de jeux vidéo. Le service est fourni gratuitement et peut être modifié ou interrompu à tout moment."
            },
            {
              title: "3. Inscription et compte",
              content: "Pour utiliser Backlogg, vous devez créer un compte avec une adresse e-mail valide. Vous êtes responsable de la confidentialité de votre mot de passe et de toutes les activités effectuées depuis votre compte. Vous devez avoir au moins 13 ans pour utiliser ce service."
            },
            {
              title: "4. Contenu utilisateur",
              content: "Vous êtes seul responsable du contenu que vous publiez (avis, commentaires, listes). Tout contenu offensant, illégal, haineux ou trompeur est interdit. Nous nous réservons le droit de supprimer tout contenu violant ces règles et de suspendre les comptes contrevenants."
            },
            {
              title: "5. Propriété intellectuelle",
              content: "Les données de jeux proviennent de l'API IGDB (Twitch). Les noms, logos et images de jeux vidéo sont la propriété de leurs éditeurs respectifs. Backlogg ne revendique aucun droit sur ces contenus."
            },
            {
              title: "6. Données personnelles",
              content: "Nous collectons uniquement les données nécessaires au fonctionnement du service (e-mail, pseudo, bibliothèque de jeux). Consultez notre Politique de Confidentialité dans les Paramètres pour plus d'informations."
            },
            {
              title: "7. Limitation de responsabilité",
              content: "Backlogg est fourni 'tel quel', sans garantie d'aucune sorte. Nous ne sommes pas responsables des interruptions de service, pertes de données ou dommages indirects résultant de l'utilisation de l'application."
            },
            {
              title: "8. Modification des conditions",
              content: "Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prennent effet dès leur publication. L'utilisation continue du service après modification vaut acceptation des nouvelles conditions."
            },
            {
              title: "9. Contact",
              content: "Pour toute question relative à ces conditions, contactez-nous via la page Contact."
            },
          ].map(section => (
            <div key={section.title} className="glass rounded-xl p-6">
              <h2 className="font-bold text-foreground mb-3">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}