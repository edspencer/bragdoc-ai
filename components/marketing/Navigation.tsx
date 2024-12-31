import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import ModeToggle from '@/components/mode-toggle';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center mx-auto">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
              src="/images/logo/logo-transparent-svg.svg"
              alt="bragdoc.ai logo"
              width={120}
              height={48}
              className="h-20 w-auto"
            />
          </Link>
        </div>
        <div className="hidden md:flex justify-end flex-1 pr-8">
          <NavigationMenu>
            <NavigationMenuList className="gap-8">
              <NavigationMenuItem>
                <Link href="/what" legacyBehavior passHref>
                  <NavigationMenuLink className="hover:font-semibold">
                    What
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/why" legacyBehavior passHref>
                  <NavigationMenuLink className="hover:font-semibold">
                    Why
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/how" legacyBehavior passHref>
                  <NavigationMenuLink className="hover:font-semibold">
                    How
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center space-x-4">
          <ModeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
