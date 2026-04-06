import { Link } from 'react-router-dom';

export default function RgpdPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Retour
          </Link>
          <h1 className="text-2xl font-bold text-white">Données personnelles (RGPD)</h1>
        </div>

        <p className="text-xs text-gray-500">Dernière mise à jour : avril 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Données collectées</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            FitTrack collecte et stocke les données suivantes :
          </p>
          <ul className="text-gray-400 text-sm leading-relaxed list-disc list-inside space-y-1">
            <li>Nom et adresse email (à la création du compte)</li>
            <li>Mot de passe hashé (non lisible)</li>
            <li>Données d'entraînement : séances, exercices, séries, poids, répétitions</li>
            <li>Date et heure des séances</li>
          </ul>
          <p className="text-gray-400 text-sm leading-relaxed">
            Aucune donnée n'est partagée avec des tiers. Aucun cookie de tracking n'est utilisé.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Finalité</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Les données sont collectées uniquement pour faire fonctionner l'application : authentification,
            affichage de ton historique et de ta progression. Elles ne sont utilisées à aucune autre fin.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Stockage</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Les données sont hébergées sur un serveur privé situé en France, dans une base de données PostgreSQL
            sécurisée. Les mots de passe sont chiffrés avec bcrypt et ne sont jamais stockés en clair.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Tes droits</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Conformément au RGPD, tu disposes des droits suivants :
          </p>
          <ul className="text-gray-400 text-sm leading-relaxed list-disc list-inside space-y-1">
            <li>Droit d'accès à tes données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (suppression du compte)</li>
            <li>Droit à la portabilité</li>
          </ul>
          <p className="text-gray-400 text-sm leading-relaxed">
            Pour exercer ces droits, tu peux utiliser le bouton "Demander la suppression de mon compte" dans ton
            profil, ou contacter directement l'administrateur.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Responsable du traitement :{' '}
            <a href="mailto:benoit.chocot@gmail.com" className="text-indigo-400 hover:text-indigo-300">
              benoit.chocot@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
