package template

import (
	"html/template"
)

var FooterTemplate = template.Must(template.New("footer").Parse(`

<footer>
	<hr>
	<p>&copy; 2026 Sistem Manajemen Aset</p>
</footer>

</body>
</html>

`))
