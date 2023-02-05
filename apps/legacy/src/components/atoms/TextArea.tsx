import styled from '@emotion/styled';
import { inputStyle } from './Input';

const TextArea = styled.textarea`
  ${inputStyle};
  resize: none;
  width: 100%;
`;

export default TextArea;
