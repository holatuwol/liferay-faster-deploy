<%@ page import="IMPORT_THEME_DISPLAY" %>
<%@ page import="IMPORT_WEB_KEYS" %>

<%@ page import="java.util.Map" %>

<%
ThemeDisplay themeDisplay = (ThemeDisplay)request.getAttribute(WebKeys.THEME_DISPLAY);

if (!themeDisplay.isStatePopUp()) {
%>

<div class="alert alert-info"><ul>
<li><strong>TAG_NAME hash</strong>: GIT_HASH_PUBLIC</li>
<li><strong>TAG_NAME-private hash</strong>: GIT_HASH_PRIVATE</li>
</ul></div>

<%
}
%>