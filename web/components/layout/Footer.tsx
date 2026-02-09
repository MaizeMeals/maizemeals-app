import Link from "next/link"
import Logo from "@/components/branding/Logo"

export default function Footer() {
    return (
        <footer className="w-full border-t bg-background py-12">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                        <Logo />
                        <p className="text-sm text-muted-foreground">
                            The ultimate dining companion for University of Michigan students.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Product</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/menus" className="hover:text-foreground transition-colors">Menus</Link></li>
                            <li><Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link></li>
                            <li><Link href="/nutrition" className="hover:text-foreground transition-colors">Nutrition</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                            <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                            <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
                     <p>© {new Date().getFullYear()} MaizeMeals. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
