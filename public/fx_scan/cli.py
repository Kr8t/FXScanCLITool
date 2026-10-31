"""FX SCAN — CLI entry point.

Displays two color-coded tables using the rich library:
  1. INSIDE DAY — completed candles strictly within previous day's range
  2. CLOSED IN BREAKOUT (CIB) — close strictly beyond prev High/Low

Row colors are based on candle direction (green=bullish, red=bearish,
white=neutral), NOT signal type.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .config import FX_PAIRS, PAIR_NAMES, DEFAULT_PIP_BUFFER
from .data import fetch_all
from .strategy import analyze_all, Signal
from .cache import clear as clear_cache

console = Console()


def _style_for(direction: str) -> str:
    """Return rich style string based on candle direction."""
    return {
        "bullish": "bold green",
        "bearish": "bold red",
        "neutral": "bold white",
    }.get(direction, "white")


def _arrow(direction: str) -> str:
    return {"bullish": "▲", "bearish": "▼", "neutral": "■"}.get(direction, "—")


def _build_table(
    title: str,
    signals: list[Signal],
) -> Table:
    """Build a rich Table for a list of signals."""
    table = Table(
        title=title,
        show_header=True,
        header_style="bold cyan",
        border_style="dim",
        title_style="bold magenta",
    )
    table.add_column("Pair", justify="left", min_width=10)
    table.add_column("Date", justify="center")
    table.add_column("Close", justify="right")
    table.add_column("Dir", justify="center", width=4)
    table.add_column("Prev Date", justify="center")
    table.add_column("Prev H", justify="right")
    table.add_column("Prev L", justify="right")
    table.add_column("Buffer", justify="right")

    if not signals:
        table.add_row(
            Text("No signals detected", style="dim italic"),
            "", "", "", "", "", "", "",
        )
        return table

    for sig in signals:
        style = _style_for(sig.direction)
        arrow = _arrow(sig.direction)
        name = PAIR_NAMES.get(sig.symbol, sig.symbol)
        c = sig.candle
        p = sig.prev_candle
        table.add_row(
            Text(name, style=style),
            Text(c.date, style=style),
            Text(f"{c.close:.5f}", style=style),
            Text(arrow, style=style),
            Text(p.date, style="dim"),
            Text(f"{p.high:.5f}", style="dim"),
            Text(f"{p.low:.5f}", style="dim"),
            Text(f"{sig.pip_buffer:.1f}", style="yellow"),
        )
    return table


def main(argv: list[str] | None = None) -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="fx-scan",
        description="Scan 18 major FX pairs for Inside Day & CIB signals.",
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Bypass cache and re-download all data.",
    )
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Clear the SQLite cache and exit.",
    )
    parser.add_argument(
        "--pip-buffer",
        type=float,
        default=DEFAULT_PIP_BUFFER,
        help=f"Pip buffer for CIB detection (default: {DEFAULT_PIP_BUFFER}).",
    )
    args = parser.parse_args(argv)

    if args.clear_cache:
        clear_cache()
        console.print("[green]✓[/green] Cache cleared.")
        return

    console.print(Panel(
        f"[bold]FX SCAN[/bold] — {len(FX_PAIRS)} pairs | "
        f"Buffer: {args.pip_buffer} pips | "
        f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}",
        style="bold blue",
    ))

    # Fetch data
    with console.status("[bold green]Fetching market data…"):
        data = fetch_all(force=args.force)

    if not data:
        console.print("[red]No data retrieved. Check your network.[/red]")
        sys.exit(1)

    console.print(f"  ✓ Loaded data for {len(data)} pairs")

    # Analyze
    signals = analyze_all(data, pip_buffer=args.pip_buffer)

    inside_days = [s for s in signals if s.signal_type == "inside_day"]
    cibs = [s for s in signals if s.signal_type == "cib"]

    # Debug: Show what dates are being analyzed
    console.print(f"\n  [dim]Analyzing latest completed candles:[/dim]")
    for symbol in list(data.keys())[:3]:  # Show first 3 as examples
        candles = data[symbol]
        if len(candles) >= 2:
            prev = candles[-2]
            curr = candles[-1]
            name = PAIR_NAMES.get(symbol, symbol)
            console.print(
                f"    [dim]{name}: {prev['date']} → {curr['date']}[/dim]"
            )

    # Render tables
    console.print()
    console.print(_build_table("📊 INSIDE DAY (close inside prev range)", inside_days))
    console.print()
    console.print(_build_table("🚀 CLOSED IN BREAKOUT (close outside prev range)", cibs))
    console.print()

    # Summary
    total = len(signals)
    console.print(
        f"  [dim]Total signals: {total} "
        f"(ID: {len(inside_days)}, CIB: {len(cibs)})[/dim]"
    )


if __name__ == "__main__":
    main()
