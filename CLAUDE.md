# CLAUDE.md - Regras obrigatórias para todos os prompts

## Regra principal

**NUNCA alterar lógicas que já estão funcionando.** Apenas corrigir exatamente o que for solicitado no prompt, sem refatorar, reorganizar ou "melhorar" código que não foi pedido.

## Regras específicas

1. **Antes de qualquer alteração**, identificar exatamente quais arquivos e funções precisam ser modificados para resolver apenas o problema solicitado.

2. **Se durante a correção** de um problema for identificado algo que "poderia ser melhorado" em outra parte do código, **NÃO alterar**. Apenas reportar o que foi encontrado.

3. **Nunca alterar** políticas RLS, queries, permissões ou lógicas de cálculo que não estejam diretamente relacionadas ao problema solicitado.

4. **Após cada correção**, listar apenas os arquivos que foram modificados e descrever exatamente o que foi alterado.

5. **Em caso de dúvida** sobre o escopo da alteração, perguntar antes de implementar.

## Objetivo

Evitar o loop infinito de correções causado por alterações desnecessárias em lógicas que já foram corrigidas e estão funcionando corretamente.
