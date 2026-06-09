# Zentero Auth Email Templates

Copy these into Supabase Dashboard -> Authentication -> Emails -> Templates.

Supabase variables reference:
- `{{ .ConfirmationURL }}` - ready-to-use verification/recovery/magic-link URL
- `{{ .Token }}` - OTP code
- `{{ .TokenHash }}` - hashed OTP for custom verify flows
- `{{ .SiteURL }}` - configured app Site URL
- `{{ .RedirectTo }}` - redirect passed from the client
- `{{ .Email }}` - user's email

## Confirm Sign Up

Subject:

```text
Potvrďte e-mail pro Zentero
```

HTML:

```html
<h2>Vítejte v Zentero</h2>
<p>Děkujeme za registraci. Potvrďte prosím svůj e-mail, aby se váš účet aktivoval.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fbbf24;color:#111827;text-decoration:none;font-weight:700;">
    Potvrdit e-mail
  </a>
</p>
<p>Odkaz je časově omezený. Pokud jste si účet nevytvářeli vy, tento e-mail ignorujte.</p>
```

## Magic Link

Subject:

```text
Váš přihlašovací odkaz do Zentero
```

HTML:

```html
<h2>Přihlášení do Zentero</h2>
<p>Kliknutím na tlačítko se bezpečně přihlásíte bez hesla.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fbbf24;color:#111827;text-decoration:none;font-weight:700;">
    Přihlásit se
  </a>
</p>
<p>Odkaz je jednorázový a brzy vyprší. Otevřete ho ideálně ve stejném prohlížeči, ze kterého jste o přihlášení požádali.</p>
<p>Pokud jste o přihlášení nežádali, e-mail ignorujte.</p>
```

## Reset Password

Subject:

```text
Obnovení hesla do Zentero
```

HTML:

```html
<h2>Obnovení hesla</h2>
<p>Přišla žádost o nastavení nového hesla k vašemu účtu Zentero.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fbbf24;color:#111827;text-decoration:none;font-weight:700;">
    Nastavit nové heslo
  </a>
</p>
<p>Odkaz je časově omezený. Pokud jste reset hesla nevyžádali vy, e-mail ignorujte a heslo se nezmění.</p>
```

## Invite User

Subject:

```text
Pozvánka do Zentero
```

HTML:

```html
<h2>Máte pozvánku do Zentero</h2>
<p>Někdo vás pozval ke spolupráci ve workspace. Přijměte pozvánku a dokončete přihlášení.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#fbbf24;color:#111827;text-decoration:none;font-weight:700;">
    Přijmout pozvánku
  </a>
</p>
<p>Pokud jste pozvánku nečekali, e-mail můžete ignorovat.</p>
```
