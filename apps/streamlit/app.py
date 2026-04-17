import streamlit as st
import qrcode
import io
import os
import folium
from streamlit_folium import st_folium
from supabase import create_client
from datetime import datetime, timezone, timedelta

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = st.secrets["SUPABASE_URL"]
SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
PWA_URL      = st.secrets.get("PWA_URL", "http://localhost:5173")

@st.cache_resource
def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

sb = get_client()

st.set_page_config(page_title="Cleaning Admin", page_icon="🧹", layout="wide")

# ── Sidebar nav ─────────────────────────────────────────────────────────────
page = st.sidebar.radio("Navigation", ["📊 Overview", "📍 Sites", "👤 Cleaners", "📋 Reports", "🗺️ Map", "⚙️ Settings"])
st.sidebar.markdown("---")
st.sidebar.caption("Cleaning Check-In Admin")

# ════════════════════════════════════════════════════════════════════════════
# OVERVIEW
# ════════════════════════════════════════════════════════════════════════════
if page == "📊 Overview":
    st.title("Overview")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        r = sb.table("visits").select("id", count="exact").gte("check_in_at", f"{today}T00:00:00Z").execute()
        st.metric("Check-ins today", r.count or 0)
    with col2:
        r = sb.table("visits").select("id", count="exact").eq("status", "in_progress").execute()
        st.metric("Active now", r.count or 0)
    with col3:
        r = sb.table("sites").select("id", count="exact").execute()
        st.metric("Sites", r.count or 0)
    with col4:
        r = sb.table("cleaners").select("id", count="exact").eq("active", True).execute()
        st.metric("Active cleaners", r.count or 0)

    st.subheader("Recent visits")
    visits = sb.table("visits").select("*, sites(name), cleaners(full_name)").order("check_in_at", desc=True).limit(20).execute().data

    if not visits:
        st.info("No visits yet.")
    else:
        for v in visits:
            with st.container(border=True):
                c1, c2, c3, c4 = st.columns([2, 2, 2, 1])
                c1.write(f"**{v['sites']['name'] if v.get('sites') else '—'}**")
                c2.write(v['cleaners']['full_name'] if v.get('cleaners') else '—')
                cin = v.get('check_in_at', '')
                c3.write(cin[:16].replace('T', ' ') if cin else '—')
                status_map = {"in_progress": "🟡 In Progress", "completed": "✅ Completed", "abandoned": "🔴 Abandoned"}
                c4.write(status_map.get(v.get('status', ''), v.get('status', '')))
                if not v.get('gps_verified'):
                    st.caption("⚠️ GPS not verified")


# ════════════════════════════════════════════════════════════════════════════
# SITES
# ════════════════════════════════════════════════════════════════════════════
elif page == "📍 Sites":
    st.title("Sites")

    sites = sb.table("sites").select("*").order("name").execute().data

    # ── Add site form ──
    with st.expander("➕ Add new site"):
        with st.form("add_site"):
            name    = st.text_input("Site name", placeholder="Unit 4A – 123 Smith St")
            address = st.text_input("Address", placeholder="123 Smith Street, Sydney NSW 2000")
            c1, c2 = st.columns(2)
            lat = c1.number_input("Latitude",  value=-33.8688, format="%.6f")
            lng = c2.number_input("Longitude", value=151.2093, format="%.6f")
            radius = st.number_input("GPS radius (metres)", value=200, min_value=50, max_value=2000)

            if st.form_submit_button("Create site"):
                if not name or not address:
                    st.error("Name and address are required.")
                else:
                    res = sb.table("sites").insert({
                        "name": name, "address": address,
                        "latitude": lat, "longitude": lng,
                        "gps_radius_meters": radius
                    }).execute()
                    new_id = res.data[0]["id"]

                    # Generate + upload QR
                    qr_url = f"{PWA_URL}/checkin?site={new_id}"
                    img = qrcode.make(qr_url)
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    buf.seek(0)
                    path = f"sites/{new_id}/qr.png"
                    sb.storage.from_("qrcodes").upload(path, buf.read(), {"content-type": "image/png", "upsert": "true"})
                    public_url = sb.storage.from_("qrcodes").get_public_url(path)
                    sb.table("sites").update({"qr_code_url": public_url}).eq("id", new_id).execute()

                    st.success(f"Site '{name}' created!")
                    st.rerun()

    # ── Site list ──
    if not sites:
        st.info("No sites yet. Add one above.")
    else:
        for site in sites:
            with st.container(border=True):
                c1, c2 = st.columns([3, 1])
                with c1:
                    st.markdown(f"**{site['name']}**")
                    st.caption(site['address'])
                    st.caption(f"GPS radius: {site['gps_radius_meters']}m  |  lat {site['latitude']}, lng {site['longitude']}")
                with c2:
                    if site.get('qr_code_url'):
                        st.image(site['qr_code_url'], width=120)
                        # Download button
                        qr_img = qrcode.make(f"{PWA_URL}/checkin?site={site['id']}")
                        buf = io.BytesIO()
                        qr_img.save(buf, format="PNG")
                        st.download_button(
                            "⬇️ Download QR",
                            data=buf.getvalue(),
                            file_name=f"qr-{site['name'].lower().replace(' ', '-')}.png",
                            mime="image/png",
                            key=f"dl_{site['id']}"
                        )


# ════════════════════════════════════════════════════════════════════════════
# CLEANERS
# ════════════════════════════════════════════════════════════════════════════
elif page == "👤 Cleaners":
    st.title("Cleaners")
    st.info("Cleaners appear here automatically after they first sign in by scanning a QR code.")

    cleaners = sb.table("cleaners").select("*").order("full_name").execute().data

    if not cleaners:
        st.warning("No cleaners yet — share a site QR code to get started.")
    else:
        for c in cleaners:
            with st.container(border=True):
                col1, col2, col3 = st.columns([3, 2, 1])
                col1.write(f"**{c['full_name']}**  \n{c['email']}")
                col2.write(f"Joined: {c['created_at'][:10]}")
                status = "✅ Active" if c['active'] else "⛔ Inactive"
                col3.write(status)
                label = "Deactivate" if c['active'] else "Activate"
                if col3.button(label, key=f"toggle_{c['id']}"):
                    sb.table("cleaners").update({"active": not c['active']}).eq("id", c['id']).execute()
                    st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# REPORTS
# ════════════════════════════════════════════════════════════════════════════
elif page == "📋 Reports":
    st.title("Reports")

    # Filters
    sites    = sb.table("sites").select("id, name").order("name").execute().data
    cleaners = sb.table("cleaners").select("id, full_name").order("full_name").execute().data

    c1, c2, c3, c4, c5 = st.columns(5)
    site_opts    = {"All sites": None} | {s['name']: s['id'] for s in sites}
    cleaner_opts = {"All cleaners": None} | {c['full_name']: c['id'] for c in cleaners}
    status_opts  = {"All": None, "In Progress": "in_progress", "Completed": "completed", "Abandoned": "abandoned"}

    site_sel    = c1.selectbox("Site",    list(site_opts.keys()))
    cleaner_sel = c2.selectbox("Cleaner", list(cleaner_opts.keys()))
    status_sel  = c3.selectbox("Status",  list(status_opts.keys()))
    date_from   = c4.date_input("From", value=None)
    date_to     = c5.date_input("To",   value=None)

    q = sb.table("visits").select("*, sites(name), cleaners(full_name)").order("check_in_at", desc=True).limit(200)
    if site_opts[site_sel]:       q = q.eq("site_id", site_opts[site_sel])
    if cleaner_opts[cleaner_sel]: q = q.eq("cleaner_id", cleaner_opts[cleaner_sel])
    if status_opts[status_sel]:   q = q.eq("status", status_opts[status_sel])
    if date_from:                 q = q.gte("check_in_at", f"{date_from}T00:00:00Z")
    if date_to:                   q = q.lte("check_in_at", f"{date_to}T23:59:59Z")

    visits = q.execute().data
    st.caption(f"{len(visits)} visit(s) found")

    for v in visits:
        cin  = (v.get('check_in_at')  or '')[:16].replace('T', ' ')
        cout = (v.get('check_out_at') or '')[:16].replace('T', ' ')
        status_map = {"in_progress": "🟡", "completed": "✅", "abandoned": "🔴"}
        icon = status_map.get(v.get('status', ''), '❓')
        gps  = "✅ GPS" if v.get('gps_verified') else "⚠️ No GPS"

        label = f"{icon} **{v['sites']['name'] if v.get('sites') else '?'}** — {v['cleaners']['full_name'] if v.get('cleaners') else '?'} | In: {cin} | Out: {cout or '—'} | {gps}"
        with st.expander(label):
            # Photos
            photos = sb.table("photos").select("*").eq("visit_id", v['id']).order("captured_at").execute().data
            if photos:
                before = [p for p in photos if p['phase'] == 'before']
                after  = [p for p in photos if p['phase'] == 'after']
                if before:
                    st.write("**Before**")
                    cols = st.columns(min(len(before), 4))
                    for i, p in enumerate(before):
                        url = sb.storage.from_("photos").create_signed_url(p['storage_path'], 3600)['signedURL']
                        cols[i % 4].image(url, use_column_width=True)
                if after:
                    st.write("**After**")
                    cols = st.columns(min(len(after), 4))
                    for i, p in enumerate(after):
                        url = sb.storage.from_("photos").create_signed_url(p['storage_path'], 3600)['signedURL']
                        cols[i % 4].image(url, use_column_width=True)
            else:
                st.caption("No photos")

            # Answers
            answers = sb.table("answers").select("*, questions(label)").eq("visit_id", v['id']).execute().data
            if answers:
                st.write("**Questionnaire**")
                for a in answers:
                    q_label = a['questions']['label'] if a.get('questions') else a['question_id']
                    st.write(f"- **{q_label}**: {a['value']}")
            else:
                st.caption("No questionnaire answers")


# ════════════════════════════════════════════════════════════════════════════
# MAP
# ════════════════════════════════════════════════════════════════════════════
elif page == "🗺️ Map":
    st.title("Site Map")
    st.caption("🔴 Issues in last 30 days (rating < 3 or GPS failures)  ·  🟢 All good  ·  ⚪ No recent visits")

    sites = sb.table("sites").select("*").execute().data
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    if not sites:
        st.info("No sites yet.")
    else:
        # Centre map on average of all sites
        avg_lat = sum(s['latitude']  for s in sites) / len(sites)
        avg_lng = sum(s['longitude'] for s in sites) / len(sites)
        m = folium.Map(location=[avg_lat, avg_lng], zoom_start=12, tiles="CartoDB positron")

        for site in sites:
            visits = sb.table("visits").select("id, gps_verified, status").eq("site_id", site['id']).gte("check_in_at", cutoff).execute().data

            if not visits:
                color, status_text = "gray", "No recent visits"
            else:
                issues = []
                # GPS failures
                gps_fails = sum(1 for v in visits if not v.get('gps_verified'))
                if gps_fails:
                    issues.append(f"{gps_fails} GPS failure(s)")

                # Low ratings (< 3)
                visit_ids = [v['id'] for v in visits]
                low_ratings = 0
                for vid in visit_ids:
                    answers = sb.table("answers").select("value, questions(type)").eq("visit_id", vid).execute().data
                    for a in answers:
                        if a.get('questions', {}).get('type') == 'rating':
                            try:
                                if int(a['value']) < 3:
                                    low_ratings += 1
                            except (ValueError, TypeError):
                                pass
                if low_ratings:
                    issues.append(f"{low_ratings} low rating(s)")

                if issues:
                    color = "red"
                    status_text = " · ".join(issues)
                else:
                    color = "green"
                    status_text = f"{len(visits)} visit(s), all good"

            popup_html = f"""
                <b>{site['name']}</b><br>
                {site['address']}<br>
                <small>{status_text}</small>
            """
            folium.CircleMarker(
                location=[site['latitude'], site['longitude']],
                radius=14,
                color="white",
                weight=2,
                fill=True,
                fill_color=color,
                fill_opacity=0.85,
                popup=folium.Popup(popup_html, max_width=220),
                tooltip=site['name'],
            ).add_to(m)

        st_folium(m, use_container_width=True, height=550)

        # Summary table below map
        st.subheader("Site summary")
        for site in sites:
            visits = sb.table("visits").select("id, gps_verified").eq("site_id", site['id']).gte("check_in_at", cutoff).execute().data
            gps_fails = sum(1 for v in visits if not v.get('gps_verified'))
            st.write(f"**{site['name']}** — {len(visits)} visit(s) in last 30 days" + (f" · ⚠️ {gps_fails} GPS issue(s)" if gps_fails else ""))


# ════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ════════════════════════════════════════════════════════════════════════════
elif page == "⚙️ Settings":
    st.title("Settings")
    st.subheader("Global Questionnaire")
    st.caption("These questions appear on every visit.")

    questions = sb.table("questions").select("*").is_("site_id", "null").order("sort_order").execute().data

    # Add question form
    with st.expander("➕ Add question"):
        with st.form("add_question"):
            label    = st.text_input("Question text")
            qtype    = st.selectbox("Type", ["yesno", "text", "rating", "select"])
            options  = st.text_area("Options (one per line, for 'select' only)", height=80) if qtype == "select" else ""
            sort_ord = st.number_input("Sort order", value=len(questions) + 1)
            if st.form_submit_button("Add"):
                if label:
                    opts = [o.strip() for o in options.splitlines() if o.strip()] if qtype == "select" else None
                    sb.table("questions").insert({
                        "label": label, "type": qtype,
                        "options": opts, "sort_order": int(sort_ord)
                    }).execute()
                    st.rerun()

    if not questions:
        st.info("No questions yet.")
    else:
        for q in questions:
            with st.container(border=True):
                c1, c2, c3 = st.columns([4, 1, 1])
                c1.write(f"**{q['label']}**  \n`{q['type']}`  · order {q['sort_order']}")
                status = "✅ Active" if q['active'] else "⛔ Off"
                c2.write(status)
                toggle_label = "Disable" if q['active'] else "Enable"
                if c2.button(toggle_label, key=f"tq_{q['id']}"):
                    sb.table("questions").update({"active": not q['active']}).eq("id", q['id']).execute()
                    st.rerun()
                if c3.button("Delete", key=f"dq_{q['id']}"):
                    sb.table("questions").delete().eq("id", q['id']).execute()
                    st.rerun()
