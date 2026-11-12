{{- define "allinscrum.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Release-Name, ergänzt um den Chart-Namen, sofern er ihn nicht schon enthält. */}}
{{- define "allinscrum.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := include "allinscrum.name" . }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/* Namespace aller Ressourcen; leer = Namespace des Releases (helm --namespace). */}}
{{- define "allinscrum.namespace" -}}
{{- default .Release.Namespace .Values.namespace }}
{{- end }}

{{- define "allinscrum.selectorLabels" -}}
app.kubernetes.io/name: {{ include "allinscrum.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: server
{{- end }}

{{- define "allinscrum.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{ include "allinscrum.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | quote }}
app.kubernetes.io/part-of: allinscrum
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "allinscrum.claimName" -}}
{{- default (printf "%s-data" (include "allinscrum.fullname" .)) .Values.persistence.existingClaim }}
{{- end }}
