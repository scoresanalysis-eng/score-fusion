import Link from "next/link";
import { Icon } from "./logo";

function Footer() {
  return (
    <>
      {/* Footer */}
      <footer className="border-t border-border py-8 md:py-12 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Icon />
                <span className="text-lg md:text-2xl font-bold">
                  ScoreFusion
                </span>
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                Your trusted platform for expert sports predictions and betting
                insights.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">
                Quick Links
              </h3>
              <ul className="space-y-1.5 md:space-y-2 text-muted-foreground text-xs md:text-sm">
                <li>
                  <Link href="/tips" className="hover:text-primary">
                    Free Tips
                  </Link>
                </li>
                <li>
                  <Link href="/vip" className="hover:text-primary">
                    VIP Area
                  </Link>
                </li>
                <li>
                  <Link href="/earnings" className="hover:text-primary">
                    Earn Rewards
                  </Link>
                </li>
                <li>
                  {/* <Link href="/referral" className="hover:text-primary">
                    Referrals
                  </Link> */}
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 md:mb-4 text-sm md:text-base">
                Support
              </h3>
              <ul className="space-y-1.5 md:space-y-2 text-muted-foreground text-xs md:text-sm">
                <li>
                  <Link href="/about" className="hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="hover:text-primary">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-6 md:mt-8 pt-6 md:pt-8 text-center text-muted-foreground text-xs md:text-sm">
            <p>
              &copy; 2025 ScoreFusion. All rights reserved. For entertainment
              purposes only.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
