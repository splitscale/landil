import Link from "next/link";

const navLinks = [
	{ href: "/about", label: "About" },
];

export function Footer() {
	return (
		<footer className="w-full *:px-4 *:md:px-6">
			<div className="flex flex-col gap-6 py-6">
				<div className="flex items-center justify-between">
					<Link href="/" className="text-sm font-semibold tracking-tight">
						Landil
					</Link>
				</div>

				<nav>
					<ul className="flex flex-wrap gap-4 font-medium text-muted-foreground text-sm md:gap-6">
						{navLinks.map((link) => (
							<li key={link.label}>
								<Link className="hover:text-foreground transition-colors" href={link.href}>
									{link.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</div>

			<div className="flex items-center justify-between gap-4 border-t py-4 text-muted-foreground text-sm">
				<p>&copy; {new Date().getFullYear()} Landil</p>

				<p className="inline-flex items-center gap-1">
					<span>Built by</span>
					<a
						aria-label="Splitscale"
						className="font-medium text-foreground/80 hover:text-foreground hover:underline underline-offset-4 transition-colors"
						href="https://splitscale.ph"
						rel="noreferrer"
						target="_blank"
					>
						Splitscale
					</a>
				</p>
			</div>
		</footer>
	);
}

export default Footer;
