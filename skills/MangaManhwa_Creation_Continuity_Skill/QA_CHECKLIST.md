# QA Checklist com Pontuação

## Sistema de nota

Cada categoria recebe 0-3:

- 0 = falhou / contraditório / inutilizável.
- 1 = aceitável com problemas graves.
- 2 = bom, utilizável.
- 3 = profissional, consistente e claro.

A página só passa se:

- nenhuma categoria tiver 0;
- média geral >= 2.4;
- personagem >= 2;
- continuidade >= 2;
- balões >= 2.

Produção completa/readiness só passa se média dos testes >= 2.6.

## Categorias

### Personagem
0 mudou completamente; 1 parcialmente reconhecível; 2 consistente; 3 profissionalmente consistente em ângulos/emoções.

### Continuidade
0 contradiz anterior; 1 graves inconsistências; 2 coerente; 3 excelente herança e consequência.

### Balões
0 ilegível; 1 confuso; 2 bom; 3 profissional com ordem, rabicho e espaço.

### Composição
0 confusa; 1 básica; 2 boa; 3 cinematográfica.

### Narrativa
0 não avança; 1 fraca; 2 funcional; 3 forte e envolvente.

### Prompt
0 vago; 1 genérico; 2 detalhado; 3 pronto para produção.

## QA por escopo

### Página
- [ ] Objetivo claro.
- [ ] Painel principal destacado.
- [ ] Ritmo compatível com emoção.
- [ ] Continuidade herdada e deixada.

### Painel
- [ ] Câmera, pose, ação e expressão claros.
- [ ] Elemento visual principal legível.
- [ ] Nada importante coberto.

### Capítulo
- [ ] Começo, meio, clímax e gancho.
- [ ] Estado final exportado.
- [ ] Promessas narrativas acompanhadas.

### Volume/arco
- [ ] Evolução do protagonista.
- [ ] Conflito cresce.
- [ ] Consequências permanentes.

### Manhwa vertical
- [ ] Scroll respira.
- [ ] Impacto após pausa.
- [ ] Balões topo→baixo.

### Mangá tradicional
- [ ] Ordem de leitura clara.
- [ ] Gutters e hierarquia.
- [ ] PB/retícula/contraste com função.

## Tabela de QA
| Item | Personagem | Continuidade | Balões | Composição | Narrativa | Prompt | Média | Passa? |
|---|---:|---:|---:|---:|---:|---:|---:|---|

## Exemplo Lua de Ferro p.4
Personagem 3; Continuidade 3; Balões 2.5; Composição 2.8; Narrativa 2.8; Prompt 3; Média 2.85; Passa.

## Correção
Se qualquer categoria <2, reescrever roteiro/prompt antes de prosseguir. Não maquiar pontuação.
