# Contribution economy

Flow-State's community layer is not a feature bolted on top of a data product. It is the mechanism by which the product covers rivers governments don't instrument, access points no agency documents, and conditions that change faster than any scraper can track.

The model is straightforward: **funders put money in, contributors earn it out, everyone consumes the resulting knowledge, the platform takes a cut.**

## The five roles in the value loop

```
Funder/Sponsor ──► funds bounty ──► posted to a river / corridor / AP / rapid / listing
                                              │
                    Contributor ◄── claims ───┘
                          │
                          └──► submits data ──► community verification ──► accepted
                                                                               │
              Platform fee ◄── retained ─────────────────────────────────────┘
                                                                               │
                Contributor ◄── paid out ────────────────────────────────────┘
                                                                               │
              Public visitor + Member ◄── reads resulting knowledge ──────────┘
```

Admins can also advertise bounties directly — either funded by the platform or on behalf of sponsors. The loop is the same.

## Bounty forms

Bounties attach a specific reward to a specific gap in the knowledge base. Three forms:

- **Cash bounty** — a funder deposits real money held in escrow. Released to the contributor on acceptance.
- **Ad-sponsored bounty** — a business (outfitter, gear shop, shuttle service) pays to advertise a bounty; the contributor earns the cash, the sponsor gets placement.
- **Platform-funded bounty** — Flow-State itself funds a bounty to seed high-priority gaps (e.g., a new corridor launch).

Bounties can be scoped to: a river, a corridor, an access point, a rapid, a shuttle or outfitter listing, photos at a specific flow, aerial imagery of a put-in or take-out, or raft-line documentation.

## What community fills

Precisely the gaps government data does not cover:

| Data type | Specifics |
|---|---|
| **Access points** | Type (trailer ramp with parking, slide rails, carry-in/out, horse pack-in, fly-in); GPS pin; seasonal access notes; fee / permit required |
| **Photos** | River at specific flow levels; put-in/take-out logistics; rapid mouth; campsite condition |
| **Rapid documentation** | Line descriptions per water level; hazard callouts; class at current flow; scout/portage info |
| **Campsites** | Location, capacity, permit requirement (river miles permit, recreation area permit, permit lottery) |
| **Shuttle logistics** | Road condition, gate schedules, distance and time estimates |
| **Shuttle business listings** | Company name, contact, service area, current pricing, verified by contributor |
| **Outfitter reports** | Trip conditions, water temp, observed hazards — timestamped and attributed |

These are the things that make a river trip go smoothly. They're also the things Mountain Buzz threads try and fail to be: authoritative, current, structured, and findable. **This is what Mountain Buzz wants to be when it grows up.** Flow-State builds the structure Mountain Buzz never had.

## Real-money principle

Payments are real from the start. No "points," no "karma," no future-phase IOUs.

The payment architecture must support:
- **Funder deposits** into escrow/hold before a bounty is posted
- **Escrow release** to contributor on acceptance
- **Platform fee** retained at release time
- **Refunds** to funder if a bounty expires unfilled or is rejected
- **Payout account** for contributors (ACH/Stripe Connect or equivalent)

These are stated as direction, not implementation detail. The payment rail comes before the first paid bounty; no bounty ships without it.

## Self-governance

Real money is a powerful incentive. It is also a powerful incentive to submit junk. The governance model must scale without full-time moderation.

The principles:

- **Community verification before payout.** A submitted contribution reaches a threshold of independent verifications before acceptance. Threshold is configurable per data type (photos are lower; business listings and rapid safety notes are higher).
- **Flagging.** Any member can flag a submission as inaccurate, outdated, or inappropriate. Flags trigger re-review.
- **Reputation.** A contributor's acceptance rate and flag rate determine how much weight their future submissions carry. High-reputation contributors may get faster acceptance; low-reputation contributors may require more community votes.
- **Trust-weighted acceptance.** Verification votes are weighted by verifier reputation. A field guide who's had 50 submissions accepted outweighs a brand-new account.
- **Admins as backstop.** Admins can override acceptance, revoke payouts, and ban bad actors. They are the backstop, not the frontline.

The goal is a system that polices itself well enough that admin intervention is the exception.

## The new moat

The structured, verified, provenance-tagged community knowledge base — sitting on top of the government data corpus — is the strategic asset that compounds over time. Government gauges don't change; community knowledge does. Every accepted contribution makes the product more valuable for the next user. Every payout makes the next contributor more likely to show up.

This knowledge base cannot be replicated by scraping. It requires the incentive structure, the verification layer, and the time.
