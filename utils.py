from datetime import datetime, timedelta

jours_sem = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]

DEFAULT_CONFIG = {
    "lundi": [7.5, 12.5, 13.5, 17],
    "mardi": [7.5, 12.5, 13.5, 17],
    "mercredi": [7.5, 12.5, 13.5, 17],
    "jeudi": [7.5, 12.5, 13.5, 17],
    "vendredi": [7.5, 12.5]
}

def next_work_time(dt, config):
    while True:
        dt = dt.replace(second=0, microsecond=0)
        j = jours_sem[dt.weekday()]

        if dt.weekday() >= 5:
            dt += timedelta(days=1)
            dt = dt.replace(hour=0, minute=0)
            continue

        horaires = config[j]
        h = dt.hour + dt.minute / 60

        if j == "vendredi":
            start, end = horaires
            if h < start:
                return dt.replace(hour=int(start), minute=int((start % 1) * 60))
            if h < end:
                return dt
            dt += timedelta(days=1)
            dt = dt.replace(hour=0, minute=0)
            continue

        sm, em, sa, ea = horaires

        if h < sm:
            return dt.replace(hour=int(sm), minute=int((sm % 1) * 60))
        if h < em:
            return dt
        if h < sa:
            return dt.replace(hour=int(sa), minute=int((sa % 1) * 60))
        if h < ea:
            return dt

        dt += timedelta(days=1)
        dt = dt.replace(hour=0, minute=0)


def add_hours(start, hours, config):
    current = next_work_time(start, config)
    remaining = hours

    while remaining > 0:
        current = next_work_time(current, config)

        h = current.hour + current.minute / 60
        j = jours_sem[current.weekday()]
        horaires = config[j]

        if j == "vendredi":
            end_day = horaires[1]
        else:
            sm, em, sa, ea = horaires
            end_day = em if h < em else ea

        available = end_day - h

        if remaining <= available:
            return current + timedelta(hours=remaining)

        remaining -= available
        current += timedelta(hours=available)


def work_time_between(start, end, config):
    total = 0
    current = start

    while current < end:
        current = next_work_time(current, config)

        if current >= end:
            break

        h = current.hour + current.minute / 60
        j = jours_sem[current.weekday()]
        horaires = config[j]

        if j == "vendredi":
            end_day = horaires[1]
        else:
            sm, em, sa, ea = horaires
            end_day = em if h < em else ea

        next_stop = current.replace(
            hour=int(end_day),
            minute=int((end_day % 1) * 60)
        )

        if next_stop > end:
            next_stop = end

        delta = (next_stop - current).total_seconds() / 3600
        total += max(0, delta)

        current = next_stop

    return total
                                                       
