import Link from 'next/link'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold">Wellesley Marketplace</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Use</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: February 2026</p>

        <div className="bg-white rounded-xl shadow-md p-8 space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Wellesley College Marketplace ("the Platform"), you agree to be bound by these Terms of Use. If you do not agree to these terms, you may not use the Platform. These terms may be updated at any time without prior notice, and continued use of the Platform constitutes acceptance of any changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Eligibility</h2>
            <p>The Platform is exclusively available to current Wellesley College students, faculty, and staff with a valid <strong>@wellesley.edu</strong> email address. By registering, you confirm that you are a current member of the Wellesley College community. The Platform operator reserves the right to terminate access for any user at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Platform Role & Limitation of Liability</h2>
            <p className="mb-3">The Wellesley College Marketplace is an <strong>independent, student-run platform</strong> and is <strong>not affiliated with, endorsed by, or operated by Wellesley College</strong>. The Platform serves solely as a venue for users to post and discover listings. The Platform operator:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Is <strong>not a party</strong> to any transaction between buyers and sellers</li>
              <li>Does <strong>not verify</strong> the accuracy, legality, or quality of any listings</li>
              <li>Does <strong>not guarantee</strong> the completion of any transaction</li>
              <li>Is <strong>not responsible</strong> for any loss, damage, injury, or harm resulting from transactions made through the Platform</li>
              <li>Is <strong>not liable</strong> for any disputes between buyers and sellers</li>
              <li>Is <strong>not responsible</strong> for items that are misrepresented, defective, lost, stolen, or never delivered</li>
              <li>Is <strong>not responsible</strong> for the conduct or actions of any user</li>
            </ul>
            <p className="mt-3 text-sm bg-yellow-50 border border-yellow-200 rounded-md p-3 text-yellow-800">
              <strong>All transactions are made entirely at the user's own risk.</strong> The Platform operator shall not be held liable for any direct, indirect, incidental, special, or consequential damages arising from the use of this Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. User Responsibilities</h2>
            <p className="mb-3">By using the Platform, you agree that you are solely responsible for:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>All items you list, sell, buy, or exchange through the Platform</li>
              <li>Ensuring that all items you list are legal, accurately described, and yours to sell</li>
              <li>All communications and interactions with other users</li>
              <li>Verifying the condition, authenticity, and legality of items before purchasing</li>
              <li>Arranging and completing transactions safely</li>
              <li>Paying any applicable taxes on transactions</li>
              <li>Resolving any disputes with other users directly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Prohibited Items & Activities</h2>
            <p className="mb-3">The following are strictly prohibited on the Platform:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Illegal goods, controlled substances, or drugs of any kind</li>
              <li>Weapons, firearms, ammunition, or dangerous materials</li>
              <li>Stolen property or items obtained through illegal means</li>
              <li>Counterfeit, fake, or trademark-infringing items</li>
              <li>Alcohol or tobacco products</li>
              <li>Prescription medications or medical devices</li>
              <li>Hazardous materials or chemicals</li>
              <li>Adult or sexually explicit content</li>
              <li>Items that infringe on intellectual property rights</li>
              <li>Spam, fraudulent listings, or scam activity</li>
              <li>Harassment, hate speech, or discriminatory content</li>
              <li>Any activity that violates Wellesley College's Honor Code or policies</li>
              <li>Any activity that violates applicable local, state, or federal laws</li>
            </ul>
            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 font-bold mb-1">⚠️ Legal Consequences</p>
              <p className="text-red-700 text-sm">Users who list, sell, or attempt to trade illegal goods or engage in prohibited activities will be immediately removed from the Platform. Such activities <strong>will be reported to Wellesley College administration and, where appropriate, to law enforcement authorities</strong>. The Platform operator accepts no liability for illegal activities conducted by users and will fully cooperate with any law enforcement investigation.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. No Warranty</h2>
            <p>The Platform is provided <strong>"as is"</strong> and <strong>"as available"</strong> without any warranties of any kind, either express or implied. The Platform operator makes no warranty that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. The Platform operator reserves the right to modify, suspend, or discontinue the Platform at any time without notice.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless the Platform operator and any associated individuals from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Platform, your violation of these Terms, or your violation of any rights of another user or third party.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Privacy & Data</h2>
            <p>By using the Platform, you consent to the collection and use of your email address and profile information for the purpose of operating the Platform. Your information will not be sold to third parties. However, the Platform operator may disclose user information to law enforcement or college administration if required by law or in response to suspected illegal activity.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Dispute Resolution</h2>
            <p>All disputes between buyers and sellers are the sole responsibility of the parties involved. The Platform operator is not obligated to mediate, arbitrate, or resolve any dispute. Users are encouraged to resolve disputes directly and amicably. The Platform operator reserves the right to remove any listing or user account involved in a dispute at its sole discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Intellectual Property</h2>
            <p>By posting photos or content on the Platform, you grant the Platform operator a non-exclusive, royalty-free license to display that content on the Platform. You confirm that you own or have the right to use any content you post. You may not use the Platform's name, logo, or branding without prior written permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Account Termination</h2>
            <p>The Platform operator reserves the right to suspend or terminate any user account at any time, for any reason, without prior notice. This includes but is not limited to violations of these Terms, suspected fraudulent activity, or complaints from other users. Terminated users may not re-register without explicit permission.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Governing Law</h2>
            <p>These Terms of Use shall be governed by and construed in accordance with the laws of the Commonwealth of Massachusetts, without regard to its conflict of law provisions.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact</h2>
            <p>If you have questions about these Terms of Use, or wish to report a violation, please contact the Platform operator at <a href="mailto:jb122@wellesley.edu" className="text-blue-600 hover:underline">jb122@wellesley.edu</a>.</p>
          </section>

          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 text-center">
              By using the Wellesley College Marketplace, you acknowledge that you have read, understood, and agree to these Terms of Use.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-gray-500 text-sm">Made with 💙 by Juliette Bacuvier • Wellesley College Class of 2026</p>
          <a href="https://buymeacoffee.com/jbacuvier" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
            ☕ Buy me a coffee!
          </a>
        </div>
      </footer>
    </div>
  )
}
