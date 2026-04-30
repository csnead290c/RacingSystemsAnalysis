# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "RSA Logo" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "RSA Logo" [ref=e6]
    - navigation [ref=e8]:
      - link "Home" [ref=e9] [cursor=pointer]:
        - /url: /
      - button "More menu" [ref=e10] [cursor=pointer]: ☰
    - generic [ref=e11]:
      - button "Toggle theme" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
      - link "Sign In" [ref=e15] [cursor=pointer]:
        - /url: /login
  - main [ref=e16]:
    - generic [ref=e17]:
      - heading "Login" [level=1] [ref=e19]
      - generic [ref=e20]:
        - heading "Sign In" [level=2] [ref=e21]
        - generic [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Email
            - textbox "you@example.com" [ref=e25]
          - generic [ref=e26]:
            - generic [ref=e27]: Password
            - textbox "••••••••" [ref=e28]
          - button "Sign In" [ref=e29] [cursor=pointer]
        - button "Forgot password?" [ref=e31] [cursor=pointer]
        - generic [ref=e32]:
          - generic [ref=e33]: Don't have an account?
          - link "Create an account" [ref=e34] [cursor=pointer]:
            - /url: /register
  - contentinfo [ref=e35]: Racing Systems Analysis © 2026
```