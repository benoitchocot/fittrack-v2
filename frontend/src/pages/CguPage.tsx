import { Link } from 'react-router-dom';

export default function CguPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Retour
          </Link>
          <h1 className="text-2xl font-bold text-white">Conditions générales d'utilisation</h1>
        </div>

        <p className="text-xs text-gray-500">Dernière mise à jour : avril 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">1. Présentation</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            FitTrack est une application personnelle de suivi d'entraînement sportif. Elle permet à ses utilisateurs
            d'enregistrer leurs séances, leurs exercices et de suivre leur progression.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">2. Accès au service</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            L'accès à FitTrack est réservé aux personnes disposant d'un compte. La création d'un compte implique
            l'acceptation des présentes conditions. L'application est fournie "en l'état", sans garantie de
            disponibilité permanente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">3. Utilisation</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            L'utilisateur s'engage à utiliser l'application à des fins personnelles et non commerciales. Il est
            interdit de tenter d'accéder aux données d'autres utilisateurs ou de compromettre la sécurité de
            l'application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">4. Responsabilité</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            FitTrack ne saurait être tenu responsable des dommages directs ou indirects liés à l'utilisation de
            l'application. Les informations de suivi sportif fournies par l'application sont à titre indicatif et ne
            remplacent pas l'avis d'un professionnel de santé.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">5. Modification des CGU</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Ces conditions peuvent être modifiées à tout moment. La date de mise à jour est indiquée en haut de cette
            page. L'utilisation continue de l'application après modification vaut acceptation des nouvelles conditions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">6. Contact</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Pour toute question relative aux présentes conditions, tu peux contacter l'administrateur à l'adresse :{' '}
            <a href="mailto:benoit.chocot@gmail.com" className="text-indigo-400 hover:text-indigo-300">
              benoit.chocot@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
