import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How IndieBookShop.com collects, uses, and protects your information, including cookies used by Google AdSense and how to opt out.',
  alternates: { canonical: '/privacy' },
};

const EFFECTIVE_DATE = 'November 5, 2026';
const CONTACT_EMAIL = 'info@bluestonebrands.com';

const linkClass = 'text-brand-teal underline hover:text-brand-teal-hover';

export default function PrivacyPage() {
  return (
    <>
      <section className="w-full py-6 md:py-8 lg:py-10 bg-brand-cream">
        <div className="container-site">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-brand-brown mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600">Effective {EFFECTIVE_DATE}</p>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container-site">
          <div className="max-w-3xl mx-auto prose prose-lg prose-p:text-gray-700 prose-li:text-gray-700 prose-headings:font-serif prose-headings:text-brand-brown">
            <p>
              IndieBookShop.com (“IndieBookShop,” “we,” “us”) is a directory of independent bookshops. This policy explains what information we collect when you use the site, how we use it, and the choices you have. We don’t sell your personal information, and you can browse the directory without creating an account or telling us who you are.
            </p>

            <h2>Information you give us</h2>
            <p>We only collect personal information when you choose to send it through one of our forms:</p>
            <ul>
              <li>
                <strong>Newsletter signup.</strong> Your email address, which we store so we can send you the newsletter.
              </li>
              <li>
                <strong>Contact form.</strong> Your name, email address, and message, which we use to reply to you.
              </li>
              <li>
                <strong>Bookshop submissions and suggested edits.</strong> The bookshop details you enter, plus your name and email address if you provide them, so we can review the submission and follow up with questions.
              </li>
              <li>
                <strong>Event submissions.</strong> The event details and your contact information, so we can review and publish the event.
              </li>
            </ul>
            <p>
              Form messages are delivered to us by email through SendGrid (Twilio). Newsletter signups and bookshop submissions are also recorded in a private Google Sheet that only we can access. We keep this information for as long as we need it for the purpose you sent it, and you can ask us to delete it at any time.
            </p>

            <h2>Information collected automatically</h2>
            <ul>
              <li>
                <strong>Analytics.</strong> We use Vercel Web Analytics and Speed Insights to count page views and measure how fast pages load. They don’t use cookies and don’t identify individual visitors; we see only aggregate numbers.
              </li>
              <li>
                <strong>Server logs and abuse prevention.</strong> Like any website, our hosting provider (Vercel) receives your IP address, browser type, and the pages you request. We use IP addresses briefly to rate-limit searches and form submissions and to block abuse. We don’t use them to identify you.
              </li>
              <li>
                <strong>Your location, only if you ask.</strong> When you tap “Use my location,” your browser asks for permission first. If you allow it, your approximate coordinates are sent to our server to find nearby bookshops. We don’t store them.
              </li>
              <li>
                <strong>Maps.</strong> Our maps are provided by Mapbox. When a map loads, your browser requests map tiles from Mapbox, which receives your IP address under the{' '}
                <a href="https://www.mapbox.com/legal/privacy" className={linkClass} target="_blank" rel="noopener noreferrer">
                  Mapbox privacy policy
                </a>
                .
              </li>
            </ul>

            <h2>Advertising and cookies</h2>
            <p>
              We use Google AdSense to show ads on some pages, which helps keep the directory free. Google and its partners, as third-party vendors, use cookies and similar technologies to serve ads based on your prior visits to this website and other websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and other sites on the internet.
            </p>
            <p>You can control how ads are personalized:</p>
            <ul>
              <li>
                Opt out of personalized advertising from Google in{' '}
                <a href="https://adssettings.google.com" className={linkClass} target="_blank" rel="noopener noreferrer">
                  Google’s Ad Settings
                </a>
                .
              </li>
              <li>
                Opt out of personalized advertising from other participating vendors at{' '}
                <a href="https://www.aboutads.info/choices" className={linkClass} target="_blank" rel="noopener noreferrer">
                  aboutads.info
                </a>
                .
              </li>
              <li>Block or delete cookies in your browser settings. Ads will still appear, but they won’t be personalized.</li>
            </ul>
            <p>
              Learn more about{' '}
              <a href="https://policies.google.com/technologies/partner-sites" className={linkClass} target="_blank" rel="noopener noreferrer">
                how Google uses information from sites that use its services
              </a>
              . If you visit from the European Economic Area, the United Kingdom, or Switzerland, we’ll ask for your consent before ad cookies are used, and you can change your choice at any time.
            </p>
            <p>Apart from advertising, the site doesn’t set its own tracking cookies.</p>

            <h2>Links to other websites</h2>
            <p>
              Bookshop listings link to shops’ own websites, Google Maps, and other sites. Those sites have their own privacy practices, which this policy doesn’t cover.
            </p>

            <h2>Children’s privacy</h2>
            <p>
              The site isn’t directed at children under 13, and we don’t knowingly collect personal information from them. If you believe a child has sent us information, contact us and we’ll delete it.
            </p>

            <h2>Your choices and rights</h2>
            <p>
              You can ask us to access, correct, or delete the personal information you’ve sent us, or to remove you from the newsletter, by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
              . Depending on where you live (for example, California or the EU), you may have additional rights under local law, and we’ll honor those requests.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              If we change this policy, we’ll update it on this page and change the effective date above.
            </p>

            <h2>Contact us</h2>
            <p>
              Questions about this policy? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>{' '}
              or use our <Link href="/contact" className={linkClass}>contact form</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
